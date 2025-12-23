import 'dotenv/config';

import { fetchLatestOriginalNeedingUpdate, publishUpdatedArticle } from './services/laravelApi.js';
import { googleTopCompetitors } from './services/serpapi.js';
import { extractMainArticle } from './services/scrape.js';
import { rewriteWithLlm } from './services/llm.js';
import { requireEnv, parseMaxUpdatesPerRun, parseMaxCompetitorChars } from './utils/env.js';
import { generateCitationsHtml } from './utils/html.js';

interface ScrapedCompetitor {
	url: string;
	serpTitle: string | null;
	extractedTitle: string | null;
	text: string;
}

function normalizeQuery(title: string): string {
	const raw = String(title || '').trim();
	// Remove common site suffixes like " - Beyondchats" / "| BeyondChats".
	return raw
		.replace(/\s*[-|–—]\s*beyond\s*chats\s*$/i, '')
		.replace(/\s*[-|–—]\s*beyondchats\s*$/i, '')
		.replace(/\s*\(\s*beyond\s*chats\s*\)\s*$/i, '')
		.replace(/\s*\(\s*beyondchats\s*\)\s*$/i, '')
		.trim();
}

function buildSearchQueries(originalTitle: string): string[] {
	const base = String(originalTitle || '').trim();
	const normalized = normalizeQuery(base);
	const queries = [base, normalized, `${normalized} article`, `${normalized} blog`]
		.map((q) => q.trim())
		.filter(Boolean);
	// Dedupe while preserving order.
	return Array.from(new Set(queries));
}

async function pickAndScrapeTwoCompetitors(originalTitle: string): Promise<ScrapedCompetitor[]> {
	const queries = buildSearchQueries(originalTitle);
	const chosen: ScrapedCompetitor[] = [];
	const seenUrls = new Set<string>();

	for (const query of queries) {
		if (chosen.length >= 2) break;
		console.log(`Searching competitors for query: ${query}`);

		// Ask for a larger candidate pool; scraping will filter further.
		const candidates = await googleTopCompetitors(query, { limit: 50 });
		for (const c of candidates) {
			if (chosen.length >= 2) break;
			if (!c?.url || seenUrls.has(c.url)) continue;
			seenUrls.add(c.url);

			try {
				const extracted = await extractMainArticle(c.url);
				const text = (extracted.text || '').trim();
				if (!text) {
					throw new Error('Empty extracted text');
				}
				console.log(`Picked competitor: ${c.url}`);
				chosen.push({
					url: c.url,
					serpTitle: c.title ?? null,
					extractedTitle: extracted.title ?? null,
					text,
				});
			} catch (err) {
				const msg = String((err as any)?.message ?? err);
				console.log(`Skip competitor (scrape failed): ${c.url} :: ${msg}`);
				continue;
			}
		}
	}

	// We prefer 2 competitors, but some queries/topics may legitimately only yield 1
	// usable result after filtering + scraping. In that case, continue with 1 competitor
	// and let the LLM prompt reflect the missing reference.
	if (chosen.length < 1) {
		throw new Error(
			`Could not scrape any competitor article (scraped=${chosen.length}). ` +
			`Tried queries: ${queries.join(' | ')}`
		);
	}

	return chosen;
}

async function main(): Promise<void> {
	requireEnv('API_BASE_URL');
	requireEnv('SERPAPI_API_KEY');
	requireEnv('LLM_API_KEY');
	const maxUpdates = parseMaxUpdatesPerRun();
	const maxChars = parseMaxCompetitorChars();
	console.log(`MAX_UPDATES_PER_RUN=${maxUpdates}`);

	let ok = 0;
	let failed = 0;

	for (let i = 0; i < maxUpdates; i += 1) {
		const original = await fetchLatestOriginalNeedingUpdate();
		if (!original) {
			if (ok === 0 && failed === 0) {
				console.log('No original article needing update. Exiting.');
			}
			break;
		}

		console.log(`Selected original: id=${original.id} title=${original.title}`);

		try {
			const competitors = await pickAndScrapeTwoCompetitors(original.title);
			console.log('Competitor URLs:', competitors.map((c) => c.url).join(' | '));
			if (competitors.length < 2) {
				console.log('Warning: Only 1 competitor scraped; proceeding with a single reference.');
			}

			const competitorA = competitors[0];
			const competitorB = competitors[1] ?? {
				url: '',
				serpTitle: null,
				extractedTitle: null,
				text: '',
			};

			const rewritten = await rewriteWithLlm({
				originalTitle: original.title,
				originalHtml: original.content,
				competitorA: {
					url: competitorA.url,
					title: competitorA.extractedTitle ?? competitorA.serpTitle ?? null,
					text: competitorA.text.slice(0, maxChars),
				},
				competitorB: {
					url: competitorB.url,
					title: competitorB.extractedTitle ?? competitorB.serpTitle ?? null,
					text: competitorB.text.slice(0, maxChars),
				},
			});

			const references = competitors.map((c) => ({
				url: c.url,
				title: c.serpTitle ?? c.extractedTitle ?? null,
			}));

			const citationsHtml = generateCitationsHtml(references);

			const updatedPayload = {
				type: 'updated' as const,
				parent_id: original.id,
				title: rewritten.title ?? original.title,
				content: `${rewritten.html}\n${citationsHtml}`,
				references,
			};

			const published = await publishUpdatedArticle(updatedPayload);
			ok += 1;
			console.log(
				`Published updated article: id=${published.id} parent_id=${published.parent_id} (ok=${ok} failed=${failed})`
			);
		} catch (err) {
			failed += 1;
			console.error(`Failed updating original id=${original.id}`);
			console.error((err as any)?.message ?? err);
		}
	}

	console.log(`Done. ok=${ok} failed=${failed}`);
	// Fail the run only if nothing could be processed successfully.
	if (ok === 0 && failed > 0) process.exit(1);
}

main().catch((err) => {
	const errAny = err as any;
	if (
		errAny?.code === 'insufficient_quota' ||
		errAny?.code === 'quota_exceeded' ||
		errAny?.message?.includes('insufficient_quota') ||
		errAny?.message?.toLowerCase?.().includes('quota')
	) {
		console.error(errAny?.message ?? err);
		console.error(
			'Action: update GitHub secret LLM_API_KEY to a key with quota (or enable billing), then rerun Content Pipeline in mode=real.\n' +
			'If using Gemini, also set LLM_PROVIDER=gemini.\n' +
			'Workaround: run Content Pipeline in mode=mock to generate a non-LLM updated version.'
		);
		process.exit(1);
	}

	console.error(err);
	process.exit(1);
});
