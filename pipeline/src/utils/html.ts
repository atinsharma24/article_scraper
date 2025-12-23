/**
 * HTML formatting utilities for article content
 */

import type { Reference } from '../types/index.js';

export function generateCitationsHtml(references: Reference[]): string {
	if (!Array.isArray(references) || references.length === 0) {
		return '';
	}

	const items = references
		.map((ref) => {
			const title = ref.title ?? ref.url;
			return `<li><a href="${ref.url}" target="_blank" rel="noopener noreferrer">${title}</a></li>`;
		})
		.join('\n');

	return `
<hr style="margin: 2rem 0;"/>
<h2>References</h2>
<ul>
${items}
</ul>
`;
}
