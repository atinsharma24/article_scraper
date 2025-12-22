function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

import { htmlToText } from 'html-to-text';
import { marked } from 'marked';

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
  const markdown = data?.choices?.[0]?.message?.content;

  if (!markdown || typeof markdown !== 'string') {
    throw new Error('LLM returned empty content');
  }

  return { title: null, markdown };
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
  const markdown = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p?.text)
    .filter(Boolean)
    .join('');

  if (!markdown || typeof markdown !== 'string') {
    throw new Error('LLM returned empty content');
  }

  return { title: null, markdown };
}

export async function rewriteWithLlm({ originalTitle, originalHtml, competitorA, competitorB }) {
  const apiKey = requireEnv('LLM_API_KEY');
  const provider = getProvider();
  const model =
    process.env.LLM_MODEL || (provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');

  const system = `You are a professional content editor.
You rewrite articles to improve clarity and structure
without copying wording, sentence structure, or layout
from reference sources.

You must:
- Preserve original meaning
- Avoid plagiarism strictly
- Use original wording
- Not invent facts`;

  const originalContent = htmlToText(originalHtml, { wordwrap: false });

  const user = `Original Article:
<<<
${originalContent}
>>>

Reference Articles (quality benchmark only):
1. ${competitorA.url}
2. ${competitorB.url}

Task:
Rewrite the original article to be clearer and more professional,
similar in quality to top Google results.
Do not copy wording or structure.
Output markdown only.`;

  let result;

  if (provider === 'gemini') {
    result = await rewriteWithGemini({ apiKey, model, system, user });
  } else {
    result = await rewriteWithOpenAi({ apiKey, model, system, user });
  }

  const markdown = result?.markdown;
  if (!markdown || typeof markdown !== 'string') {
    throw new Error('LLM returned empty content');
  }

  // Store/render as HTML in the app, while forcing the model output to be Markdown.
  const html = marked.parse(markdown);

  return { title: result?.title ?? null, html };
}
