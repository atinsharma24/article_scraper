function isDisallowedDomain(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    // Exclude the source site and common social/ugc domains that frequently block scraping.
    const disallowedHosts = new Set([
      'beyondchats.com',
      'www.beyondchats.com',
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

function looksLikeArticle(url) {
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

export async function googleTopCompetitors(query, { limit = 10 } = {}) {
  const apiKey = process.env.SERPAPI_API_KEY;
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('num', String(Math.max(2, Math.min(10, Number(limit) || 10))));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`SerpAPI error: HTTP ${res.status}`);
  }

  const data = await res.json();
  const organic = Array.isArray(data.organic_results) ? data.organic_results : [];

  const picked = [];
  for (const r of organic) {
    const link = r.link;
    if (!link) continue;
    if (isDisallowedDomain(link)) continue;
    if (!looksLikeArticle(link)) continue;

    picked.push({ url: link, title: r.title ?? null });
    if (picked.length >= limit) break;
  }

  return picked;
}
