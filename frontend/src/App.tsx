import { useEffect, useMemo, useState } from 'react';
import { getArticle, listArticles } from './api';
import './App.css';
import type { Article, ArticleIndexItem, ArticleWithUpdates } from './types';

function fmtDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

function pickLatestUpdate(updates: Article[] | undefined): Article | null {
  const arr = Array.isArray(updates) ? updates : [];
  if (arr.length === 0) return null;

  let best: Article = arr[0];
  let bestTime = new Date(best.created_at).getTime();
  if (!Number.isFinite(bestTime)) bestTime = 0;

  for (const item of arr.slice(1)) {
    let t = new Date(item.created_at).getTime();
    if (!Number.isFinite(t)) t = 0;
    if (t > bestTime) {
      best = item;
      bestTime = t;
    }
  }

  return best;
}

function App() {
  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL, []);

  const [originals, setOriginals] = useState<ArticleIndexItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedOriginal, setSelectedOriginal] = useState<ArticleWithUpdates | null>(null);
  const [updates, setUpdates] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const page = await listArticles({ type: 'original', perPage: 20 });
        const items = page?.data ?? [];
        if (cancelled) return;
        setOriginals(items);
        if (items.length > 0) {
          const firstWithUpdate = items.find((a) => (a?.updates_count ?? 0) > 0);
          setSelectedId((firstWithUpdate ?? items[0]).id);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadDetail() {
      if (!selectedId) return;
      try {
        setError(null);
        const result = await getArticle(selectedId);
        if (cancelled) return;
        setSelectedOriginal(result);
        setUpdates(result.updates ?? []);
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message ?? String(e));
      }
    }
    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const latestUpdate = useMemo(() => pickLatestUpdate(updates), [updates]);

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
                  </>
                )}
              </article>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
