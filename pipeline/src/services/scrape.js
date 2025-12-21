import { extract } from '@extractus/article-extractor';
import { htmlToText } from 'html-to-text';

export async function extractMainArticle(url) {
  const result = await extract(url);
  const title = result?.title ?? null;
  const html = result?.content ?? '';
  const text = result?.text ?? htmlToText(html, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }] });

  return { title, text, html };
}
