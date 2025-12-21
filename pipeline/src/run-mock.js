import 'dotenv/config';
import { fetchLatestOriginalNeedingUpdate, publishUpdatedArticle } from './services/laravelApi.js';

function requireEnv(name) {
	const value = process.env[name];
	if (!value) {
		console.warn(`Warning: Missing env var: ${name}`);
		return null;
	}
	return value;
}

// Mock competitor references for testing without external APIs
const mockCompetitors = [
	{
		url: 'https://example.com/article-1',
		title: 'Competitor Article 1',
		text: 'This is sample text from a competitor article.',
	},
	{
		url: 'https://example.com/article-2',
		title: 'Competitor Article 2',
		text: 'This is another sample text from a competitor article.',
	},
];

// Mock LLM rewrite for testing without LLM API
function mockRewrite(originalTitle, originalHtml) {
	const improvedHtml = originalHtml
		.replace(/<h1>/g, '<h1 style="color: #2563eb;">')
		.replace(/<h2>/g, '<h2 style="color: #3b82f6;">');

	return {
		title: `Updated: ${originalTitle}`,
		html: `<div style="max-width: 800px; margin: 0 auto;">
${improvedHtml}
<hr/>
<p><em>This article has been enhanced with additional structure and formatting.</em></p>
</div>`,
	};
}

async function main() {
	const apiBaseUrl = requireEnv('API_BASE_URL');
	if (!apiBaseUrl) {
		console.error('API_BASE_URL is required');
		process.exit(1);
	}

	console.log('Running mock pipeline (for testing without external APIs)...\n');

	const original = await fetchLatestOriginalNeedingUpdate();
	if (!original) {
		console.log('✓ No original article needing update. All articles have been processed!');
		return;
	}

	console.log(`Selected original article:`);
	console.log(`  ID: ${original.id}`);
	console.log(`  Title: ${original.title}`);
	console.log(`  Slug: ${original.slug}\n`);

	console.log('Using mock competitors (external APIs not available in this environment):');
	console.log(`  1. ${mockCompetitors[0].title} - ${mockCompetitors[0].url}`);
	console.log(`  2. ${mockCompetitors[1].title} - ${mockCompetitors[1].url}\n`);

	console.log('Rewriting article with mock LLM...');
	const rewritten = mockRewrite(original.title, original.content);

	const references = [
		{ url: mockCompetitors[0].url, title: mockCompetitors[0].title },
		{ url: mockCompetitors[1].url, title: mockCompetitors[1].title },
	];

	const citationsHtml = `
<hr style="margin: 2rem 0;"/>
<h2>References</h2>
<ul>
<li><a href="${references[0].url}" target="_blank" rel="noopener noreferrer">${references[0].title}</a></li>
<li><a href="${references[1].url}" target="_blank" rel="noopener noreferrer">${references[1].title}</a></li>
</ul>
`;

	const updatedPayload = {
		type: 'updated',
		parent_id: original.id,
		title: rewritten.title ?? original.title,
		content: `${rewritten.html}\n${citationsHtml}`,
		references,
	};

	console.log('Publishing updated article...');
	const published = await publishUpdatedArticle(updatedPayload);
	console.log(`\n✓ Successfully published updated article:`);
	console.log(`  ID: ${published.id}`);
	console.log(`  Title: ${published.title}`);
	console.log(`  Parent ID: ${published.parent_id}\n`);

	console.log('Pipeline completed successfully! 🎉');
	console.log('\nNote: This is a mock pipeline for testing purposes.');
	console.log('In production, use the real pipeline with SERPAPI_API_KEY and LLM_API_KEY.');
}

main().catch((err) => {
	console.error('Error:', err?.message ?? err);
	process.exit(1);
});
