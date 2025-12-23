/**
 * HTML formatting utilities for article content
 */

import type { Reference } from '../types/index.js';

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function normalizeHttpUrl(raw: string): string | null {
	try {
		const u = new URL(raw);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
		return u.toString();
	} catch {
		return null;
	}
}

export function generateCitationsHtml(references: Reference[]): string {
	if (!Array.isArray(references) || references.length === 0) {
		return '';
	}

	const items = references
		.map((ref) => {
			const safeUrl = normalizeHttpUrl(ref.url);
			if (!safeUrl) return null;
			const title = escapeHtml(String(ref.title ?? safeUrl));
			const href = escapeHtml(safeUrl);
			return `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${title}</a></li>`;
		})
		.filter(Boolean)
		.join('\n');

	if (!items) return '';

	return `
<hr style="margin: 2rem 0;"/>
<h2>References</h2>
<ul>
${items}
</ul>
`;
}
