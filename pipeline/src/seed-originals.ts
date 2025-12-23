import 'dotenv/config';

import { extractMainArticle } from './services/scrape.js';
import { publishOriginalArticle } from './services/laravelApi.js';
import { requireEnv } from './utils/env.js';
import type { Article } from './types/index.js';

function parseCountFromArgs(): number {
	const idx = process.argv.findIndex((a) => a === '--count');
	if (idx >= 0) {
		const raw = process.argv[idx + 1];
		const n = Number(raw);
		if (Number.isFinite(n) && n > 0) return Math.floor(n);
	}

	const env = Number(process.env.SEED_COUNT ?? '5');
	if (Number.isFinite(env) && env > 0) return Math.floor(env);

	return 5;
}

function parseResetFromEnv(): boolean {
	const raw = String(process.env.RESET_SEED ?? 'false').trim().toLowerCase();
	return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'y';
}

async function fetchHtml(url: string): Promise<string> {
	const res = await fetch(url, {
		headers: {
			'User-Agent': 'BeyondChatsAssignmentSeeder/1.0 (+https://beyondchats.com)',
		},
	});
	if (!res.ok) {
		throw new Error(`Failed to fetch ${url}. HTTP ${res.status}`);
	}
	return await res.text();
}

function toAbsoluteUrl(baseUrl: string, href: string): string | null {
	if (!href) return null;
	if (href.startsWith('http://') || href.startsWith('https://')) return href;

	const base = new URL(baseUrl);
	if (href.startsWith('//')) return `${base.protocol}${href}`;
	if (href.startsWith('/')) return `${base.protocol}//${base.host}${href}`;

	const baseDir = base.pathname.endsWith('/') ? base.pathname : base.pathname.replace(/\/[^/]*$/, '/');
	return `${base.protocol}//${base.host}${baseDir}${href}`;
}

function discoverLastPageUrl(baseUrl: string, listingHtml: string): string {
	const hrefs = Array.from(listingHtml.matchAll(/href=["']([^"']+)["']/g)).map((m) => m[1]);

	let bestHref: string | null = null;
	let maxPage = 1;
	for (const href of hrefs) {
		const absolute = toAbsoluteUrl(baseUrl, href);
		if (!absolute) continue;

		const match = absolute.match(/(?:\/page\/|[?&]page=)(\d+)/);
		if (!match) continue;

		const page = Number(match[1]);
		if (Number.isFinite(page) && page > maxPage) {
			maxPage = page;
			bestHref = absolute;
		}
	}

	if (!bestHref || maxPage <= 1) return baseUrl;

	if (bestHref.includes('page=')) {
		return bestHref.replace(/([?&]page=)\d+/, `$1${maxPage}`);
	}

	return bestHref.replace(/(\/page\/)\d+(\/)?/, `$1${maxPage}$2`);
}

function extractArticleUrls(pageUrl: string, html: string): string[] {
	const hrefs = Array.from(html.matchAll(/href=["']([^"']+)["']/g)).map((m) => m[1]);
	const urls: string[] = [];

	for (const href of hrefs) {
		if (!href || href === '#' || href.startsWith('javascript:')) continue;

		const absolute = toAbsoluteUrl(pageUrl, href);
		if (!absolute) continue;
		if (!absolute.includes('/blogs/')) continue;
		if (absolute.includes('/blogs/page/')) continue;

		const normalized = absolute.replace(/\/$/, '');
		if (normalized === 'https://beyondchats.com/blogs') continue;
		if (!isLikelyBlogPostUrl(absolute)) continue;

		urls.push(absolute);
	}

	return Array.from(new Set(urls));
}

function isLikelyBlogPostUrl(url: string): boolean {
	try {
		const u = new URL(url);
		const parts = u.pathname.split('/').filter(Boolean);
		return parts[0] === 'blogs' && parts.length === 2;
	} catch {
		return false;
	}
}

async function fetchExistingOriginalSourceUrls(): Promise<Set<string>> {
	const base = requireEnv('API_BASE_URL').replace(/\/$/, '');

	const existing = new Set<string>();
	const perPage = 100;
	const maxPages = 200;

	let page = 1;
	let lastPage = 1;

	while (page <= lastPage && page <= maxPages) {
		const res = await fetch(`${base}/api/articles?type=original&per_page=${perPage}&page=${page}`, {
			headers: { 'Accept': 'application/json' },
		});
		if (!res.ok) {
			throw new Error(`Failed to list existing originals (page=${page}). HTTP ${res.status}`);
		}

		const json: any = await res.json();
		const data = Array.isArray(json?.data) ? json.data : [];
		for (const a of data) {
			if (a?.source_url) existing.add(a.source_url);
		}

		const lp = Number(json?.last_page ?? json?.meta?.last_page ?? 1);
		lastPage = Number.isFinite(lp) && lp > 0 ? lp : lastPage;

		if (data.length === 0 && page >= lastPage) break;
		page += 1;
	}

	return existing;
}

async function listArticlesByType(type: string): Promise<Article[]> {
	const base = requireEnv('API_BASE_URL').replace(/\/$/, '');

	const results: Article[] = [];
	const perPage = 100;
	const maxPages = 200;

	let page = 1;
	let lastPage = 1;

	while (page <= lastPage && page <= maxPages) {
		const res = await fetch(
			`${base}/api/articles?type=${encodeURIComponent(type)}&per_page=${perPage}&page=${page}`,
			{ headers: { Accept: 'application/json' } }
		);
		if (!res.ok) {
			throw new Error(`Failed to list articles (type=${type}, page=${page}). HTTP ${res.status}`);
		}

		const json: any = await res.json();
		const data = Array.isArray(json?.data) ? json.data : [];
		for (const a of data) {
			if (a?.id) results.push(a);
		}

		const lp = Number(json?.last_page ?? json?.meta?.last_page ?? 1);
		lastPage = Number.isFinite(lp) && lp > 0 ? lp : lastPage;

		if (data.length === 0 && page >= lastPage) break;
		page += 1;
	}

	return results;
}

async function deleteArticleById(id: number): Promise<void> {
	const base = requireEnv('API_BASE_URL').replace(/\/$/, '');
	const res = await fetch(`${base}/api/articles/${id}`, {
		method: 'DELETE',
		headers: { Accept: 'application/json' },
	});
	if (res.status === 204 || res.status === 404) return;
	const body = await res.text().catch(() => '');
	throw new Error(`Failed to delete article id=${id}. HTTP ${res.status}: ${body}`);
}

async function resetAllArticles(): Promise<void> {
	console.log('RESET_SEED=true: deleting existing updated + original articles...');

	const updated = await listArticlesByType('updated');
	for (const a of updated) {
		await deleteArticleById(a.id);
	}
	console.log(`Deleted updated: ${updated.length}`);

	const originals = await listArticlesByType('original');
	for (const a of originals) {
		await deleteArticleById(a.id);
	}
	console.log(`Deleted originals: ${originals.length}`);
}

async function main(): Promise<void> {
	requireEnv('API_BASE_URL');
	const count = Math.max(1, Math.min(20, parseCountFromArgs()));
	const reset = parseResetFromEnv();

	if (reset) {
		await resetAllArticles();
	}

	const baseUrl = 'https://beyondchats.com/blogs/';
	console.log(`Fetching listing: ${baseUrl}`);
	const listingHtml = await fetchHtml(baseUrl);
	const lastPageUrl = discoverLastPageUrl(baseUrl, listingHtml);
	console.log(`Using last page: ${lastPageUrl}`);

	const lastPageHtml = await fetchHtml(lastPageUrl);
	let articleUrls = extractArticleUrls(lastPageUrl, lastPageHtml);
	articleUrls = articleUrls.slice(0, count);

	if (articleUrls.length === 0) {
		console.log('No article URLs found. Exiting.');
		return;
	}

	console.log(`Found ${articleUrls.length} URLs. Seeding into backend...`);
	const existing = reset ? new Set<string>() : await fetchExistingOriginalSourceUrls();

	let ok = 0;
	let failed = 0;
	for (const url of articleUrls) {
		try {
			if (existing.has(url)) {
				console.log(`Skip (already exists): ${url}`);
				continue;
			}

			const extracted = await extractMainArticle(url);
			const payload = {
				type: 'original' as const,
				title: extracted.title ?? url,
				content: extracted.html || extracted.text || url,
				source_url: url,
			};

			const created = await publishOriginalArticle(payload);
			ok += 1;
			console.log(`Seeded: id=${created.id} title=${created.title}`);
		} catch (err) {
			if ((err as any)?.status === 409) {
				console.log(`Skip (conflict/exists): ${url}`);
				continue;
			}

			failed += 1;
			console.error(`Failed: ${url}`);
			console.error((err as any)?.message ?? err);
		}
	}

	console.log(`Done. ok=${ok} failed=${failed}`);
	if (failed > 0) process.exit(1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
