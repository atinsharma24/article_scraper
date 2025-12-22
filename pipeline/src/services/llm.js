function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function getProvider() {
  const raw = (process.env.LLM_PROVIDER || 'gemini').trim().toLowerCase();
  if (raw === 'openai' || raw === 'gemini') return raw;
  throw new Error(`Unsupported LLM_PROVIDER: ${raw} (expected: openai|gemini)`);
}

async function rewriteWithOpenAi({ apiKey, model, system, user }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    const apiMessage = parsed?.error?.message;
    const apiCode = parsed?.error?.code;
    const apiType = parsed?.error?.type;

    const err = new Error(`LLM error: HTTP ${response.status}: ${apiMessage ?? raw}`);
    err.status = response.status;
    err.code = apiCode ?? apiType ?? null;

    if (response.status === 429 && apiCode === 'insufficient_quota') {
      err.message =
        'OpenAI quota exceeded (insufficient_quota). Update billing on the OpenAI account or rotate to an API key with available quota, then re-run the pipeline.';
      err.code = 'insufficient_quota';
    }

    throw err;
  }

  const data = await response.json();
  const html = data?.choices?.[0]?.message?.content;

  if (!html || typeof html !== 'string') {
    throw new Error('LLM returned empty content');
  }

  return { title: null, html };
}

async function rewriteWithGemini({ apiKey, model, system, user }) {
  // Google AI Studio (Generative Language) API.
  // Docs: https://ai.google.dev/
  const normalizedModel = String(model || '').startsWith('models/')
    ? String(model).slice('models/'.length)
    : String(model || '');

  const prompt = `${system}\n\n${user}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    normalizedModel
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
      },
    }),
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    const apiMessage = parsed?.error?.message;
    const apiStatus = parsed?.error?.status;

    const err = new Error(`LLM error: HTTP ${response.status}: ${apiMessage ?? raw}`);
    err.status = response.status;
    err.code = apiStatus ?? null;

    // Gemini quota / billing / rate limit errors usually show up as HTTP 429.
    if (response.status === 429) {
      err.message =
        'Gemini quota/rate-limit reached (HTTP 429). Check your Google AI Studio quota/billing, or rotate to an API key with available quota, then re-run the pipeline.';
      err.code = 'quota_exceeded';
    }

    if (response.status === 404) {
      err.message =
        `Gemini model not found or not supported for generateContent: ${normalizedModel}. ` +
        'Set LLM_MODEL to an available text model from Google AI Studio (e.g. gemini-2.5-flash or gemini-2.5-flash-lite), then rerun.';
      err.code = err.code ?? 'NOT_FOUND';
    }

    throw err;
  }

  const data = await response.json();
  const html = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join('');

  if (!html || typeof html !== 'string') {
    throw new Error('LLM returned empty content');
  }

  return { title: null, html };
}

export async function rewriteWithLlm({ originalTitle, originalHtml, competitorA, competitorB }) {
  const apiKey = requireEnv('LLM_API_KEY');
  const provider = getProvider();
  const model =
    process.env.LLM_MODEL || (provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');

  const system =
    'You are a careful editor. Rewrite the provided original blog article to be more structured and similar in style/format to the two competitor articles, without inventing facts. Output HTML only.';

  const user = `ORIGINAL TITLE:\n${originalTitle}\n\nORIGINAL HTML:\n${originalHtml}\n\nCOMPETITOR A (${competitorA.url})\nTITLE: ${competitorA.title ?? ''}\nTEXT:\n${competitorA.text}\n\nCOMPETITOR B (${competitorB.url})\nTITLE: ${competitorB.title ?? ''}\nTEXT:\n${competitorB.text}\n\nREQUIREMENTS:\n- Keep topic consistent with original.\n- Improve formatting and structure (headings, sections, lists).\n- Do not add a References section; the caller will append it.\n- Return valid HTML.\n\nReturn ONLY the rewritten HTML.`;

  if (provider === 'gemini') {
    return rewriteWithGemini({ apiKey, model, system, user });
  }

  return rewriteWithOpenAi({ apiKey, model, system, user });
}
