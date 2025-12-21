const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function requestJson(path) {
  const res = await fetch(`${apiBaseUrl}${path}`)
  if (res.status === 204) return null
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

export async function listArticles({ type, parentId, perPage = 10 }) {
  const url = new URL(`${apiBaseUrl}/api/articles`)
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
