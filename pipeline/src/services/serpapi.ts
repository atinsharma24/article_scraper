import type { SerpApiResponse, CompetitorData } from '../types/index.js';
import { requireEnv } from '../utils/env.js';

const disallowedHosts = new Set([
  'beyondchats.com',
  'www.beyondchats.com',
  'tmforum.org',
  'www.tmforum.org',
  'reddit.com',
  'www.reddit.com',
  'linkedin.com',
  'www.linkedin.com',
  'facebook.com',
  'www.facebook.com',
  'instagram.com',
  'www.instagram.com',
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
  't.co',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'pinterest.com',
  'www.pinterest.com',
]);

function isDisallowedDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (disallowedHosts.has(host)) return true;
    if (host.endsWith('.beyondchats.com')) return true;
    if (host.endsWith('.linkedin.com')) return true;
    if (host.endsWith('.facebook.com')) return true;
    if (host.endsWith('.instagram.com')) return true;
    if (host.endsWith('.twitter.com')) return true;
    return false;
  } catch {
    return true;
  }
}

function looksLikeArticle(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (path === '/' || path.length < 5) return false;
    if (path.endsWith('.pdf')) return false;
    if (path.includes('/tag/') || path.includes('/category/')) return false;
    if (path.includes('/search')) return false;
    return true;
  } catch {
    return false;
  }
}

interface GoogleTopCompetitorsOptions {
  limit?: number;
}

export async function googleTopCompetitors(
  query: string,
  { limit = 10 }: GoogleTopCompetitorsOptions = {}
): Promise<CompetitorData[]> {
  const apiKey = requireEnv('SERPAPI_API_KEY');
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query);
  url.searchParams.set('api_key', apiKey);

  const wanted = Math.max(2, Number(limit) || 10);
  // Pull a larger pool because we filter aggressively and scraping will fail on some sites.
  // SerpAPI supports larger `num` values for Google; keep it bounded.
  const fetchNum = Math.max(20, Math.min(100, wanted));
  url.searchParams.set('num', String(fetchNum));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`SerpAPI error: HTTP ${res.status}`);
  }

  const data = await res.json() as SerpApiResponse;
  const organic = Array.isArray(data.organic_results) ? data.organic_results : [];

  const picked: CompetitorData[] = [];
  const seen = new Set<string>();

  // Pass 1: strict (prefer links that look like article pages)
  for (const r of organic) {
    const link = r.link;
    if (!link || seen.has(link)) continue;
    seen.add(link);
    if (isDisallowedDomain(link)) continue;
    if (!looksLikeArticle(link)) continue;

    picked.push({ url: link, title: r.title ?? null, text: '' });
    if (picked.length >= wanted) return picked;
  }

  // Pass 2: relaxed (still disallow known-bad domains, but accept non-article-looking URLs)
  for (const r of organic) {
    const link = r.link;
    if (!link || seen.has(link)) continue;
    seen.add(link);
    if (isDisallowedDomain(link)) continue;

    picked.push({ url: link, title: r.title ?? null, text: '' });
    if (picked.length >= wanted) break;
  }

  return picked;
}
