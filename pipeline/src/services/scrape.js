import { extract } from '@extractus/article-extractor';
import { htmlToText } from 'html-to-text';

function headers() {
  return {
    // Many sites block “unknown” clients; using a mainstream UA helps.
    'user-agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
  };
}

function htmlToPlainText(html) {
  return htmlToText(html, {
    wordwrap: false,
    selectors: [{ selector: 'a', options: { ignoreHref: true } }],
  });
}

function parseTitleFromHtml(html) {
  const m = String(html || '').match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() || null;
}

export async function extractMainArticle(url) {
  const result = await extract(url, {}, { headers: headers() });
  const html = result?.content ?? '';

  let title = result?.title ?? null;
  let text = typeof result?.text === 'string' ? result.text : '';

  // Some sites return empty strings; treat that as empty and fall back.
  if (!text || !text.trim()) {
    if (html && String(html).trim()) {
      text = htmlToPlainText(html);
    }
  }

  // Final fallback: direct fetch + htmlToText (useful when extractor can't parse).
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
