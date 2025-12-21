import 'dotenv/config';

import { extractMainArticle } from './services/scrape.js';
import { publishOriginalArticle } from './services/laravelApi.js';

function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

function parseCountFromArgs() {
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

async function fetchHtml(url) {
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

function toAbsoluteUrl(baseUrl, href) {
	if (!href) return null;
	if (href.startsWith('http://') || href.startsWith('https://')) return href;

	const base = new URL(baseUrl);
	if (href.startsWith('//')) return `${base.protocol}${href}`;
	if (href.startsWith('/')) return `${base.protocol}//${base.host}${href}`;

	// relative
	const baseDir = base.pathname.endsWith('/') ? base.pathname : base.pathname.replace(/\/[^/]*$/, '/');
	return `${base.protocol}//${base.host}${baseDir}${href}`;
}

function discoverLastPageUrl(baseUrl, listingHtml) {
	const hrefs = Array.from(listingHtml.matchAll(/href=["']([^"']+)["']/g)).map((m) => m[1]);

	let bestHref = null;
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

function extractArticleUrls(pageUrl, html) {
	const hrefs = Array.from(html.matchAll(/href=["']([^"']+)["']/g)).map((m) => m[1]);
	const urls = [];

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

function isLikelyBlogPostUrl(url) {
	try {
		const u = new URL(url);
		const parts = u.pathname.split('/').filter(Boolean);
		// Accept only: /blogs/<slug>/
		return parts[0] === 'blogs' && parts.length === 2;
	} catch {
		return false;
	}
}

async function fetchExistingOriginalSourceUrls() {
	const base = requireEnv('API_BASE_URL').replace(/\/$/, '');
	const res = await fetch(`${base}/api/articles?type=original&per_page=100`, {
		headers: { 'Content-Type': 'application/json' },
	});
	if (!res.ok) {
		throw new Error(`Failed to list existing originals. HTTP ${res.status}`);
	}
	const json = await res.json();
	const data = Array.isArray(json?.data) ? json.data : [];
	return new Set(data.map((a) => a?.source_url).filter(Boolean));
}

function slugFromUrl(url) {
	try {
		const u = new URL(url);
		const parts = u.pathname.split('/').filter(Boolean);
		return parts[parts.length - 1] ?? null;
	} catch {
		return null;
	}
}

async function main() {
	requireEnv('API_BASE_URL');
	const count = Math.max(1, Math.min(20, parseCountFromArgs()));

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
	const existing = await fetchExistingOriginalSourceUrls();

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
				type: 'original',
				title: extracted.title ?? url,
				slug: slugFromUrl(url),
				content: extracted.html || extracted.text || url,
				source_url: url,
				published_at: null,
			};

			const created = await publishOriginalArticle(payload);
			ok += 1;
			console.log(`Seeded: id=${created.id} title=${created.title}`);
		} catch (err) {
			failed += 1;
			console.error(`Failed: ${url}`);
			console.error(err?.message ?? err);
		}
	}

	console.log(`Done. ok=${ok} failed=${failed}`);
	if (failed > 0) process.exit(1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
