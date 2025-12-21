function apiBaseUrl() {
  return (process.env.API_BASE_URL ?? '').replace(/\/$/, '');
}

async function requestJson(path, options = {}) {
  const url = `${apiBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

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
