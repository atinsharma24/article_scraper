import 'dotenv/config';

import { fetchLatestOriginalNeedingUpdate, publishUpdatedArticle } from './services/laravelApi.js';
import { googleTopCompetitors } from './services/serpapi.js';
import { extractMainArticle } from './services/scrape.js';
import { rewriteWithLlm } from './services/llm.js';

function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

function parseMaxUpdatesPerRun() {
	const raw = String(process.env.MAX_UPDATES_PER_RUN ?? '1').trim();
	const n = Number(raw);
	if (Number.isFinite(n) && n > 0) return Math.floor(n);
	return 1;
}

function parseMaxCompetitorChars() {
	const raw = String(process.env.MAX_COMPETITOR_CHARS ?? '12000').trim();
	const n = Number(raw);
	if (Number.isFinite(n) && n > 100) return Math.floor(n);
	return 12000;
}

async function pickAndScrapeTwoCompetitors(query) {
	// Pull more than 2 candidates, then scrape until we successfully extract 2.
	const candidates = await googleTopCompetitors(query, { limit: 20 });
	if (candidates.length < 2) {
		throw new Error(`Expected at least 2 competitor URLs, got ${candidates.length}`);
	}

	const chosen = [];
	for (const c of candidates) {
		if (chosen.length >= 2) break;
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
			const msg = String(err?.message ?? err);
			console.log(`Skip competitor (scrape failed): ${c.url} :: ${msg}`);
			continue;
		}
	}

	if (chosen.length < 2) {
		throw new Error(
			`Could not scrape 2 competitor articles (scraped=${chosen.length}). Try again later or reduce blocked domains by adjusting SerpAPI results.`
		);
	}

	return chosen;
}

async function main() {
	requireEnv('API_BASE_URL');
	requireEnv('SERPAPI_API_KEY');
	requireEnv('LLM_API_KEY');
	// Optional: LLM_PROVIDER=openai|gemini (default gemini)
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

			const rewritten = await rewriteWithLlm({
				originalTitle: original.title,
				originalHtml: original.content,
				competitorA: {
					url: competitors[0].url,
					title: competitors[0].extractedTitle ?? competitors[0].serpTitle ?? null,
					text: competitors[0].text.slice(0, maxChars),
				},
				competitorB: {
					url: competitors[1].url,
					title: competitors[1].extractedTitle ?? competitors[1].serpTitle ?? null,
					text: competitors[1].text.slice(0, maxChars),
				},
			});

			const references = [
				{ url: competitors[0].url, title: competitors[0].serpTitle ?? competitors[0].extractedTitle ?? null },
				{ url: competitors[1].url, title: competitors[1].serpTitle ?? competitors[1].extractedTitle ?? null },
			];

			// Ensure citations exist at the bottom of the generated article.
			const citationsHtml = `\n\n<hr/>\n<h2>References</h2>\n<ul>\n<li><a href="${references[0].url}" target="_blank" rel="noopener noreferrer">${references[0].title ?? references[0].url}</a></li>\n<li><a href="${references[1].url}" target="_blank" rel="noopener noreferrer">${references[1].title ?? references[1].url}</a></li>\n</ul>\n`;

			const updatedPayload = {
				type: 'updated',
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
			console.error(err?.message ?? err);
		}
	}

	console.log(`Done. ok=${ok} failed=${failed}`);
	if (failed > 0) process.exit(1);
}

main().catch((err) => {
	if (
		err?.code === 'insufficient_quota' ||
		err?.code === 'quota_exceeded' ||
		err?.message?.includes('insufficient_quota') ||
		err?.message?.toLowerCase?.().includes('quota')
	) {
		console.error(err?.message ?? err);
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

