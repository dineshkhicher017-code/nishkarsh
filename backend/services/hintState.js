const db = require('../db');
const { generateHintsAndSolution } = require('./ai');

function getOrCreateProgress(userId, questionId) {
  let row = db.prepare(
    'SELECT * FROM question_progress WHERE user_id = ? AND question_id = ?'
  ).get(userId, questionId);
  if (!row) {
    db.prepare(
      'INSERT INTO question_progress (user_id, question_id) VALUES (?, ?)'
    ).run(userId, questionId);
    row = db.prepare(
      'SELECT * FROM question_progress WHERE user_id = ? AND question_id = ?'
    ).get(userId, questionId);
  }
  return row;
}

// Fills any missing hint_1/hint_2/full_solution via the AI fallback and
// persists the result on the question row. Admin-authored content (already
// present) is always left untouched.
async function ensureHintContent(question) {
  if (question.hint_1 && question.hint_2 && question.full_solution) return question;

  const generated = await generateHintsAndSolution(question); // throws if not configured
  const hint_1 = question.hint_1 || generated.hint_1;
  const hint_2 = question.hint_2 || generated.hint_2;
  const full_solution = question.full_solution || generated.full_solution;

  db.prepare(
    'UPDATE questions SET hint_1 = ?, hint_2 = ?, full_solution = ? WHERE id = ?'
  ).run(hint_1, hint_2, full_solution, question.id);

  return { ...question, hint_1, hint_2, full_solution };
}

// Finds up to `limit` remedial Easy questions tagged with the given
// prerequisite, excluding the question that triggered Root Cause Isolation.
// (Real bank lookup for now — Step 5's Buddy layer adds true AI-generated
// remedial questions on top of this, per the spec's "generated_questions".)
function findRemedialQuestions(prerequisite, excludeQuestionId, limit = 5) {
  const rows = db.prepare(`
    SELECT id, question_text, options_json, difficulty, core_topic, prerequisites_json
    FROM questions
    WHERE difficulty = 'Easy' AND id != ?
  `).all(excludeQuestionId);

  const needle = prerequisite.toLowerCase();
  const matches = rows.filter((r) => {
    const prereqs = r.prerequisites_json ? JSON.parse(r.prerequisites_json) : [];
    return prereqs.some((p) => p.toLowerCase().includes(needle) || needle.includes(p.toLowerCase()));
  });

  return matches.slice(0, limit).map((r) => ({
    id: r.id,
    question_text: r.question_text,
    options: r.options_json ? JSON.parse(r.options_json) : null,
    difficulty: r.difficulty,
    core_topic: r.core_topic,
  }));
}

module.exports = { getOrCreateProgress, ensureHintContent, findRemedialQuestions };
