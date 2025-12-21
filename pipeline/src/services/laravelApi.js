function apiBaseUrl() {
  return (process.env.API_BASE_URL ?? '').replace(/\/$/, '');
}

async function fetchWithRetry(url, options, { retries, timeoutMs }) {
  let lastError;
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
      lastError = err;

      const isAbort = err?.name === 'AbortError';
      const causeCode = err?.cause?.code;
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

async function requestJson(path, options = {}) {
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
      ...(options.headers ?? {}),
    },
    },
    { retries: 2, timeoutMs: 120_000 }
  );

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} for ${url}: ${body}`);
  }

  return response.json();
}

export async function fetchLatestOriginalNeedingUpdate() {
  return requestJson('/api/articles/latest-original-needing-update');
}

export async function publishUpdatedArticle(payload) {
  return requestJson('/api/articles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function publishOriginalArticle(payload) {
  return requestJson('/api/articles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
