import { useEffect, useMemo, useState } from 'react'
import { getArticle, listArticles } from './api'
import './App.css'

function App() {
  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL, [])

  const [originals, setOriginals] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedOriginal, setSelectedOriginal] = useState(null)
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const page = await listArticles({ type: 'original', perPage: 20 })
        const items = page?.data ?? []
        if (cancelled) return
        setOriginals(items)
        if (items.length > 0) {
          setSelectedId(items[0].id)
        }
      } catch (e) {
        if (!cancelled) setError(e?.message ?? String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadDetail() {
      if (!selectedId) return
      try {
        setError(null)
        const original = await getArticle(selectedId)
        if (cancelled) return
        setSelectedOriginal(original)
        setUpdates(original?.updates ?? [])
      } catch (e) {
        if (!cancelled) setError(e?.message ?? String(e))
      }
    }
    loadDetail()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  return (
    <div className="layout">
      <header className="header">
        <div>
          <div className="title">BeyondChats Articles</div>
          <div className="subtitle">Original and updated versions</div>
        </div>
        <div className="meta">API: {apiBaseUrl || '(not set)'}</div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <div className="sidebarHeader">Original articles</div>
          {loading ? (
            <div className="muted">Loading…</div>
          ) : originals.length === 0 ? (
            <div className="muted">No articles yet. Run the scraper.</div>
          ) : (
            <ul className="list">
              {originals.map((a) => (
                <li key={a.id}>
                  <button
                    className={a.id === selectedId ? 'item active' : 'item'}
                    onClick={() => setSelectedId(a.id)}
                  >
                    <div className="itemTitle">{a.title}</div>
                    <div className="itemMeta">id: {a.id}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="content">
          {error ? <div className="error">{error}</div> : null}

          {!selectedOriginal ? (
            <div className="muted">Select an article to view.</div>
          ) : (
            <div className="panes">
              <article className="pane">
                <div className="paneHeader">Original</div>
                <h1 className="h1">{selectedOriginal.title}</h1>
                <div
                  className="articleBody"
                  dangerouslySetInnerHTML={{ __html: selectedOriginal.content }}
                />
              </article>

              <article className="pane">
                <div className="paneHeader">Updated</div>
                {updates.length === 0 ? (
                  <div className="muted">No updated version yet. Run the pipeline.</div>
                ) : (
                  <>
                    <h1 className="h1">{updates[0].title}</h1>
                    <div
                      className="articleBody"
                      dangerouslySetInnerHTML={{ __html: updates[0].content }}
                    />
                  </>
                )}
              </article>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
