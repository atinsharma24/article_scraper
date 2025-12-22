import { extract } from '@extractus/article-extractor';
import { htmlToText } from 'html-to-text';

export async function extractMainArticle(url) {
  const result = await extract(
    url,
    {},
    {
      headers: {
        // Many sites block “unknown” clients; using a mainstream UA helps.
        'user-agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
    }
  );
  const title = result?.title ?? null;
  const html = result?.content ?? '';
  const text = result?.text ?? htmlToText(html, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }] });

  return { title, text, html };
}
