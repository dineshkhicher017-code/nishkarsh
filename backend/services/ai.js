// NISHKARSH — AI fallback for hint_1 / hint_2 / full_solution.
// Only called when an admin-authored field is empty (per the spec: admin
// content is always preferred). Requires the operator to supply their own
// Anthropic API key — this app cannot make AI calls without one.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
// Verify the current model name in Anthropic's docs before deploying —
// model availability/names change over time and this default may age out.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

const SYSTEM_PROMPT = `You are the diagnostic AI tutor inside Nishkarsh, a JEE prep platform.
You will receive a question's text, its core topic, and its tagged prerequisites.
Output ONLY valid JSON (no markdown fences, no preamble) with these fields:
- "hint_1": a conceptual/situational nudge only, strictly no formulas or numbers
- "hint_2": the governing formula or method as a general template, no question-specific numbers substituted in
- "full_solution": a clear, step-by-step walkthrough in plain language, plus a one-line note on why this type of question commonly trips students up
Never reveal the final numerical answer inside hint_1 or hint_2. Keep tone encouraging, sharp, and exam-focused — never condescending.`;

async function generateHintsAndSolution(question) {
  if (!ANTHROPIC_API_KEY) {
    const err = new Error('AI generation is not configured — no ANTHROPIC_API_KEY set.');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const prerequisites = question.prerequisites_json ? JSON.parse(question.prerequisites_json) : [];
  const userContent = JSON.stringify({
    question_text: question.question_text,
    core_topic: question.core_topic,
    prerequisites,
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Anthropic API call failed: ${res.status} ${text}`);
    err.code = 'AI_CALL_FAILED';
    throw err;
  }

  const data = await res.json();
  const rawText = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  let parsed;
  try {
    parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
  } catch {
    const err = new Error('AI response was not valid JSON.');
    err.code = 'AI_BAD_RESPONSE';
    throw err;
  }

  return parsed; // { hint_1, hint_2, full_solution }
}

module.exports = { generateHintsAndSolution };
