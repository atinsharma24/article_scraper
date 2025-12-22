function getApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL || '').trim()
  const base = raw.replace(/\/$/, '')

  if (!base) {
    throw new Error(
      'Missing VITE_API_BASE_URL. Set it in Vercel to https://content-pipeline-ruor.onrender.com'
    )
  }

  if (!/^https?:\/\//i.test(base)) {
    throw new Error(
      `Invalid VITE_API_BASE_URL (${raw}). It must be an absolute URL like https://content-pipeline-ruor.onrender.com`
    )
  }

  return base
}

async function requestJson(path) {
  const apiBaseUrl = getApiBaseUrl()
  const res = await fetch(`${apiBaseUrl}${path}`)
  if (res.status === 204) return null
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

export async function listArticles({ type, parentId, perPage = 10 }) {
  const apiBaseUrl = getApiBaseUrl()
  const url = new URL('/api/articles', apiBaseUrl)
  if (type) url.searchParams.set('type', type)
  if (parentId) url.searchParams.set('parent_id', parentId)
  url.searchParams.set('per_page', String(perPage))
  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

export async function getArticle(id) {
  return requestJson(`/api/articles/${id}`)
}
