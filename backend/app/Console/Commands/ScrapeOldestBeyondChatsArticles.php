<?php

namespace App\Console\Commands;

use App\Models\Article;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class ScrapeOldestBeyondChatsArticles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'articles:scrape-oldest {--count=5 : Number of oldest articles to ingest}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scrape the oldest BeyondChats blog articles from the last blogs page and store them in the database.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $count = (int) $this->option('count');
        $count = max(1, min(20, $count));

        $baseUrl = 'https://beyondchats.com/blogs/';

        $this->info("Fetching blogs listing: {$baseUrl}");
        $listingHtml = $this->fetchHtml($baseUrl);
        $lastPageUrl = $this->discoverLastPageUrl($baseUrl, $listingHtml);

        $this->info("Using last page: {$lastPageUrl}");
        $lastPageHtml = $this->fetchHtml($lastPageUrl);

        $articleUrls = $this->extractArticleUrls($lastPageUrl, $lastPageHtml);
        $articleUrls = array_slice($articleUrls, 0, $count);

        if (count($articleUrls) === 0) {
            $this->warn('No article URLs found on the last page.');
            return self::FAILURE;
        }

        $this->info('Scraping article pages...');

        $created = 0;
        $updated = 0;
        foreach ($articleUrls as $url) {
            $data = $this->scrapeArticle($url);

            $article = Article::updateOrCreate(
                ['source_url' => $data['source_url']],
                [
                    'type' => 'original',
                    'parent_id' => null,
                    'title' => $data['title'],
                    'slug' => $data['slug'],
                    'content' => $data['content'],
                    'published_at' => $data['published_at'],
                ]
            );

            if ($article->wasRecentlyCreated) {
                $created++;
                $this->line("Created: {$article->id} {$article->title}");
            } else {
                $updated++;
                $this->line("Updated: {$article->id} {$article->title}");
            }
        }

        $this->info("Done. created={$created} updated={$updated}");
        return self::SUCCESS;
    }

    private function fetchHtml(string $url): string
    {
        $response = Http::timeout(30)
            ->retry(2, 500)
            ->withHeaders([
                'User-Agent' => 'BeyondChatsAssignmentBot/1.0 (+https://beyondchats.com)',
            ])
            ->get($url);

        if (!$response->successful()) {
            throw new \RuntimeException("Failed to fetch {$url}. Status={$response->status()}");
        }

        return (string) $response->body();
    }

    private function discoverLastPageUrl(string $baseUrl, string $listingHtml): string
    {
        preg_match_all('/href=["\']([^"\']+)["\']/', $listingHtml, $matches);
        $hrefs = $matches[1] ?? [];

        $bestHref = null;
        $maxPage = 1;
        foreach ($hrefs as $href) {
            $absolute = $this->toAbsoluteUrl($baseUrl, $href);

            if (preg_match('/(?:\\/page\\/|[?&]page=)(\d+)/', $absolute, $m) !== 1) {
                continue;
            }

            $page = (int) $m[1];
            if ($page > $maxPage) {
                $maxPage = $page;
                $bestHref = $absolute;
            }
        }

        if (!$bestHref || $maxPage <= 1) {
            return $baseUrl;
        }

        if (str_contains($bestHref, 'page=')) {
            return preg_replace('/([?&]page=)\d+/', '$1'.$maxPage, $bestHref) ?? $bestHref;
        }

        return preg_replace('/(\\/page\\/)\d+(\\/)?/', '$1'.$maxPage.'$2', $bestHref) ?? $bestHref;
    }

    private function extractArticleUrls(string $pageUrl, string $html): array
    {
        preg_match_all('/href=["\']([^"\']+)["\']/', $html, $matches);
        $hrefs = $matches[1] ?? [];

        $urls = [];
        foreach ($hrefs as $href) {
            if ($href === '#' || str_starts_with($href, 'javascript:')) {
                continue;
            }

            $absolute = $this->toAbsoluteUrl($pageUrl, $href);
            if (!str_contains($absolute, '/blogs/')) {
                continue;
            }

            if (str_contains($absolute, '/blogs/page/')) {
                continue;
            }

            if (rtrim($absolute, '/') === rtrim('https://beyondchats.com/blogs', '/')) {
                continue;
            }

            $urls[] = $absolute;
        }

        $urls = array_values(array_unique($urls));

        return $urls;
    }

    private function scrapeArticle(string $url): array
    {
        $html = $this->fetchHtml($url);

        $dom = new \DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML($html);
        libxml_clear_errors();
        $xpath = new \DOMXPath($dom);

        $title = trim((string) $xpath->evaluate('string(//h1[1])'));
        if ($title === '') {
            $title = trim((string) $xpath->evaluate('string(//title)'));
        }

        $publishedAt = null;
        $publishedMeta = trim((string) $xpath->evaluate("string(//meta[@property='article:published_time']/@content)"));
        if ($publishedMeta !== '') {
            $publishedAt = Carbon::parse($publishedMeta);
        } else {
            $timeAttr = trim((string) $xpath->evaluate('string(//time[1]/@datetime)'));
            if ($timeAttr !== '') {
                $publishedAt = Carbon::parse($timeAttr);
            }
        }

        $contentNode = $xpath->query('//article')->item(0);
        if (!$contentNode) {
            $contentNode = $xpath->query("//div[contains(@class,'content')]")->item(0);
        }
        if (!$contentNode) {
            $contentNode = $xpath->query('//body')->item(0);
        }

        $contentHtml = $contentNode ? $this->innerHtml($contentNode) : '';
        $contentHtml = trim($contentHtml);

        $slug = null;
        $path = parse_url($url, PHP_URL_PATH);
        if (is_string($path)) {
            $parts = array_values(array_filter(explode('/', trim($path, '/'))));
            $slug = $parts[count($parts) - 1] ?? null;
        }

        return [
            'source_url' => $url,
            'title' => $title !== '' ? $title : $url,
            'slug' => $slug,
            'content' => $contentHtml !== '' ? $contentHtml : $html,
            'published_at' => $publishedAt,
        ];
    }

    private function innerHtml(\DOMNode $node): string
    {
        $html = '';
        foreach ($node->childNodes as $child) {
            $html .= $node->ownerDocument->saveHTML($child);
        }
        return $html;
    }

    private function toAbsoluteUrl(string $baseUrl, string $href): string
    {
        if (str_starts_with($href, 'http://') || str_starts_with($href, 'https://')) {
            return $href;
        }

        $base = parse_url($baseUrl);
        $scheme = $base['scheme'] ?? 'https';
        $host = $base['host'] ?? '';

        if (str_starts_with($href, '//')) {
            return $scheme.':'.$href;
        }

        if (str_starts_with($href, '/')) {
            return $scheme.'://'.$host.$href;
        }

        $path = $base['path'] ?? '/';
        $dir = rtrim(str_replace(basename($path), '', $path), '/');

        return $scheme.'://'.$host.($dir !== '' ? '/'.$dir : '').'/'.$href;
    }
}
