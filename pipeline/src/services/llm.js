function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export async function rewriteWithLlm({ originalTitle, originalHtml, competitorA, competitorB }) {
  const apiKey = requireEnv('LLM_API_KEY');
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  const system =
    'You are a careful editor. Rewrite the provided original blog article to be more structured and similar in style/format to the two competitor articles, without inventing facts. Output HTML only.';

  const user = `ORIGINAL TITLE:\n${originalTitle}\n\nORIGINAL HTML:\n${originalHtml}\n\nCOMPETITOR A (${competitorA.url})\nTITLE: ${competitorA.title ?? ''}\nTEXT:\n${competitorA.text}\n\nCOMPETITOR B (${competitorB.url})\nTITLE: ${competitorB.title ?? ''}\nTEXT:\n${competitorB.text}\n\nREQUIREMENTS:\n- Keep topic consistent with original.\n- Improve formatting and structure (headings, sections, lists).\n- Do not add a References section; the caller will append it.\n- Return valid HTML.\n\nReturn ONLY the rewritten HTML.`;

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
    const text = await response.text().catch(() => '');
    throw new Error(`LLM error: HTTP ${response.status}: ${text}`);
  }

  const data = await response.json();
  const html = data?.choices?.[0]?.message?.content;

  if (!html || typeof html !== 'string') {
    throw new Error('LLM returned empty content');
  }

  return { title: null, html };
}
