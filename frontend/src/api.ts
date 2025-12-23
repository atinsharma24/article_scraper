import type { ArticleIndexItem, ArticleWithUpdates, ListArticlesOptions, Paginated } from './types';

function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL || '').trim();
  const base = raw.replace(/\/$/, '');

  if (!base) {
    throw new Error(
      'Missing VITE_API_BASE_URL. Set it to your backend base URL (e.g. http://localhost:8000 or https://<your-render-app>.onrender.com).'
    );
  }

  if (!/^https?:\/\//i.test(base)) {
    throw new Error(
      `Invalid VITE_API_BASE_URL (${raw}). It must be an absolute URL like https://<your-app>.onrender.com`
    );
  }

  return base;
}

async function requestJson<T>(pathOrUrl: string): Promise<T | null> {
  const apiBaseUrl = getApiBaseUrl();
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${apiBaseUrl}${pathOrUrl}`;
  const res = await fetch(url);
  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export async function listArticles(
  { type, parentId, perPage = 10 }: ListArticlesOptions = {}
): Promise<Paginated<ArticleIndexItem>> {
  const apiBaseUrl = getApiBaseUrl();
  const url = new URL('/api/articles', apiBaseUrl);
  if (type) url.searchParams.set('type', type);
  if (parentId) url.searchParams.set('parent_id', String(parentId));
  url.searchParams.set('per_page', String(perPage));
  const result = await requestJson<Paginated<ArticleIndexItem>>(url.toString());
  if (!result) throw new Error('Unexpected empty response from /api/articles');
  return result;
}

export async function getArticle(id: number): Promise<ArticleWithUpdates> {
  const result = await requestJson<ArticleWithUpdates>(`/api/articles/${id}`);
  if (!result) throw new Error(`Article ${id} not found`);
  return result;
}
