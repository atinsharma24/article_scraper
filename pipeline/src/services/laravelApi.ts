import type { Article, OriginalArticlePayload, UpdatedArticlePayload } from '../types/index.js';

function apiBaseUrl(): string {
  return (process.env.API_BASE_URL ?? '').replace(/\/$/, '');
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface FetchRetryOptions {
  retries: number;
  timeoutMs: number;
}

async function fetchWithRetry(
  url: string,
  options: FetchOptions,
  { retries, timeoutMs }: FetchRetryOptions
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const attemptTimeoutMs = timeoutMs;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);
      try {
        return await fetch(url, { ...options, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      lastError = err as Error;

      const isAbort = (err as any)?.name === 'AbortError';
      const causeCode = (err as any)?.cause?.code;
      const isTimeoutish = isAbort || causeCode === 'UND_ERR_HEADERS_TIMEOUT';

      if (attempt >= retries || !isTimeoutish) {
        throw err;
      }

      const backoffMs = 1000 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw lastError;
}

async function requestJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = `${apiBaseUrl()}${path}`;

  if (!apiBaseUrl()) {
    throw new Error('API_BASE_URL is empty');
  }

  const response = await fetchWithRetry(
    url,
    {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers ?? {}),
    },
    },
    { retries: 2, timeoutMs: 120_000 }
  );

  if (response.status === 204) {
    return null as T;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const err = new Error(`HTTP ${response.status} for ${url}: ${body}`) as any;
    err.status = response.status;
    err.url = url;
    err.body = body;
    throw err;
  }

  return response.json() as Promise<T>;
}

export async function fetchLatestOriginalNeedingUpdate(): Promise<Article | null> {
  return requestJson<Article | null>('/api/articles/latest-original-needing-update');
}

export async function publishUpdatedArticle(payload: UpdatedArticlePayload): Promise<Article> {
  return requestJson<Article>('/api/articles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function publishOriginalArticle(payload: OriginalArticlePayload): Promise<Article> {
  return requestJson<Article>('/api/articles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
