import { useEffect, useMemo, useState } from 'react'
import { getArticle, listArticles } from './api'
import './App.css'

function fmtDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString()
}

function pickLatestUpdate(updates) {
  const arr = Array.isArray(updates) ? updates : []
  if (arr.length === 0) return null
  return [...arr].sort((a, b) => {
    const ta = new Date(a?.created_at ?? 0).getTime()
    const tb = new Date(b?.created_at ?? 0).getTime()
    return tb - ta
  })[0]
}

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
          const firstWithUpdate = items.find((a) => (a?.updates_count ?? 0) > 0)
          setSelectedId((firstWithUpdate ?? items[0]).id)
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

  const latestUpdate = useMemo(() => pickLatestUpdate(updates), [updates])

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
                    <div className="itemRow">
                      <div className="itemTitle">{a.title}</div>
                      <div className={(a?.updates_count ?? 0) > 0 ? 'badge ok' : 'badge'}>
                        {(a?.updates_count ?? 0) > 0 ? 'Updated' : 'Pending'}
                      </div>
                    </div>
                    <div className="itemMeta">
                      id: {a.id}
                      {typeof a?.updates_count === 'number' ? ` • updates: ${a.updates_count}` : ''}
                    </div>
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
                <div className="paneMeta">
                  {selectedOriginal.source_url ? (
                    <a href={selectedOriginal.source_url} target="_blank" rel="noreferrer">
                      Source
                    </a>
                  ) : (
                    <span className="muted">No source URL</span>
                  )}
                  <span className="dot">•</span>
                  <span className="muted">id: {selectedOriginal.id}</span>
                  {selectedOriginal.created_at ? (
                    <>
                      <span className="dot">•</span>
                      <span className="muted">created: {fmtDate(selectedOriginal.created_at)}</span>
                    </>
                  ) : null}
                </div>
                <div
                  className="articleBody"
                  dangerouslySetInnerHTML={{ __html: selectedOriginal.content }}
                />
              </article>

              <article className="pane">
                <div className="paneHeader">Updated</div>
                {!latestUpdate ? (
                  <div className="muted">No updated version yet. Run the pipeline.</div>
                ) : (
                  <>
                    <h1 className="h1">{latestUpdate.title}</h1>
                    <div className="paneMeta">
                      <span className="muted">id: {latestUpdate.id}</span>
                      {latestUpdate.created_at ? (
                        <>
                          <span className="dot">•</span>
                          <span className="muted">created: {fmtDate(latestUpdate.created_at)}</span>
                        </>
                      ) : null}
                    </div>
                    <div
                      className="articleBody"
                      dangerouslySetInnerHTML={{ __html: latestUpdate.content }}
                    />

                    {Array.isArray(latestUpdate.references) && latestUpdate.references.length > 0 ? (
                      <div className="refs">
                        <div className="refsTitle">References</div>
                        <ul className="refsList">
                          {latestUpdate.references.map((r, idx) => (
                            <li key={idx}>
                              <a href={r.url} target="_blank" rel="noreferrer">
                                {r.title || r.url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
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
