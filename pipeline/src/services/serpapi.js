function isDisallowedDomain(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'beyondchats.com' || host.endsWith('.beyondchats.com');
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

export async function googleTopCompetitors(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('num', '10');

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
    if (picked.length === 2) break;
  }

  return picked;
}
