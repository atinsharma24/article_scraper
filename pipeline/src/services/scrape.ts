import { extract } from '@extractus/article-extractor';
import { htmlToText } from 'html-to-text';
import type { ExtractionResult } from '../types/index.js';

type ExtractusResult = {
  title?: string | null;
  text?: string | null;
  content?: string | null;
};

function headers(): Record<string, string> {
  return {
    'user-agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
  };
}

function htmlToPlainText(html: string): string {
  return htmlToText(html, {
    wordwrap: false,
    selectors: [{ selector: 'a', options: { ignoreHref: true } }],
  });
}

function parseTitleFromHtml(html: string): string | null {
  const m = String(html || '').match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() || null;
}

export async function extractMainArticle(url: string): Promise<ExtractionResult> {
  const result = (await extract(url, {}, { headers: headers() })) as ExtractusResult | null;
  const html = typeof result?.content === 'string' ? result.content : '';

  let title = typeof result?.title === 'string' ? result.title : null;
  let text = typeof result?.text === 'string' ? result.text : '';

  if (!text || !text.trim()) {
    if (html && String(html).trim()) {
      text = htmlToPlainText(html);
    }
  }

  if (!text || !text.trim()) {
    const res = await fetch(url, {
      headers: headers(),
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`Request failed with error code ${res.status}`);
    }
    const fetchedHtml = await res.text();
    title = title ?? parseTitleFromHtml(fetchedHtml);
    text = htmlToPlainText(fetchedHtml);
  }

  if (!title) {
    title = parseTitleFromHtml(html);
  }

  return { title, text: String(text || ''), html: String(html || '') };
}
