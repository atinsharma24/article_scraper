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

async function main() {
	requireEnv('API_BASE_URL');
	requireEnv('SERPAPI_API_KEY');
	requireEnv('LLM_API_KEY');
	// Optional: LLM_PROVIDER=openai|gemini (default openai)

	const original = await fetchLatestOriginalNeedingUpdate();
	if (!original) {
		console.log('No original article needing update. Exiting.');
		return;
	}

	console.log(`Selected original: id=${original.id} title=${original.title}`);

	const competitors = await googleTopCompetitors(original.title);
	if (competitors.length < 2) {
		throw new Error(`Expected 2 competitor URLs, got ${competitors.length}`);
	}

	console.log('Competitor URLs:', competitors.map((c) => c.url).join(' | '));

	const ref1 = await extractMainArticle(competitors[0].url);
	const ref2 = await extractMainArticle(competitors[1].url);

	const maxChars = Number(process.env.MAX_COMPETITOR_CHARS ?? '20000');

	const rewritten = await rewriteWithLlm({
		originalTitle: original.title,
		originalHtml: original.content,
		competitorA: { title: ref1.title, url: competitors[0].url, text: ref1.text.slice(0, maxChars) },
		competitorB: { title: ref2.title, url: competitors[1].url, text: ref2.text.slice(0, maxChars) },
	});

	const references = [
		{ url: competitors[0].url, title: competitors[0].title ?? ref1.title ?? null },
		{ url: competitors[1].url, title: competitors[1].title ?? ref2.title ?? null },
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
	console.log(`Published updated article: id=${published.id} parent_id=${published.parent_id}`);
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

