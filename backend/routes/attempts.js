const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getOrCreateProgress, ensureHintContent, findRemedialQuestions } = require('../services/hintState');

const router = express.Router();

function normalize(v) {
  return String(v ?? '').trim().toLowerCase();
}

// Submit an answer attempt. Drives the wrong-answer-triggered hint state
// machine: 1st wrong -> Hint 1, 2nd wrong -> Hint 2, 3rd wrong -> Root
// Cause Isolation. Shares hint state with the voluntary "Need a hint?"
// path via the same question_progress row (CHANGE 2 — whichever path is
// further along wins, hint state isn't duplicated).
router.post('/attempts', requireAuth, async (req, res) => {
  const { question_id, selected_answer, time_taken_seconds } = req.body;
  if (!question_id || selected_answer === undefined || selected_answer === null) {
    return res.status(400).json({ error: 'question_id and selected_answer are required.' });
  }

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(question_id);
  if (!question) return res.status(404).json({ error: 'Question not found.' });

  const progress = getOrCreateProgress(req.user.id, question_id);
  const isCorrect = normalize(selected_answer) === normalize(question.correct_answer);

  // hints_used on the attempt record reflects how many hints were visible
  // to the student AT THE TIME of this submission (feeds the percentile
  // estimate later, per the spec).
  const hintsUsedAtSubmission = progress.hints_revealed;

  const info = db.prepare(`
    INSERT INTO attempts
      (user_id, question_id, core_topic, prerequisites_json, selected_answer,
       is_correct, time_taken_seconds, hints_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, question_id, question.core_topic, question.prerequisites_json,
    String(selected_answer), isCorrect ? 1 : 0, time_taken_seconds || null, hintsUsedAtSubmission
  );

  const response = {
    attempt_id: info.lastInsertRowid,
    is_correct: isCorrect,
    correct_answer: question.correct_answer,
    full_solution: isCorrect ? question.full_solution : null,
    hint_state: null,
  };

  if (!isCorrect) {
    const newWrongCount = progress.wrong_attempts + 1;
    let newHintsRevealed = progress.hints_revealed;
    let rootCauseActive = !!progress.root_cause_active;
    let remedialQuestions = null;

    try {
      if (newWrongCount === 1 && newHintsRevealed < 1) {
        await ensureHintContent(question);
        newHintsRevealed = 1;
      } else if (newWrongCount === 2 && newHintsRevealed < 2) {
        await ensureHintContent(question);
        newHintsRevealed = 2;
      } else if (newWrongCount >= 3 && !rootCauseActive) {
        rootCauseActive = true;
        const prereqs = question.prerequisites_json ? JSON.parse(question.prerequisites_json) : [];
        const firstPrereq = prereqs[0];
        if (firstPrereq) {
          remedialQuestions = findRemedialQuestions(firstPrereq, question.id, 5);
        }
      }
    } catch (err) {
      // Auto hint reveal failing (e.g. AI not configured) shouldn't block
      // grading the attempt itself — the student can still retry, and can
      // hit the same "no hint available" message via the voluntary button.
      response.hint_auto_reveal_error = err.code === 'AI_NOT_CONFIGURED'
        ? 'A hint would normally appear here, but no AI key is configured for auto-generated hints.'
        : 'Could not auto-generate a hint for this attempt.';
    }

    db.prepare(`
      UPDATE question_progress
      SET wrong_attempts = ?, hints_revealed = ?, root_cause_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND question_id = ?
    `).run(newWrongCount, newHintsRevealed, rootCauseActive ? 1 : 0, req.user.id, question_id);

    const freshQuestion = db.prepare('SELECT hint_1, hint_2 FROM questions WHERE id = ?').get(question_id);
    response.hint_state = {
      wrong_attempts: newWrongCount,
      hints_revealed: newHintsRevealed,
      hint_1: newHintsRevealed >= 1 ? freshQuestion.hint_1 : null,
      hint_2: newHintsRevealed >= 2 ? freshQuestion.hint_2 : null,
      root_cause_active: rootCauseActive,
      remedial_questions: remedialQuestions,
    };
  }

  res.status(201).json(response);
});

// Explicit "reveal solution" action — only allowed after Hint 1 has been
// seen (voluntary or triggered), per the spec: "skip straight to the full
// solution at any point after Hint 1."
router.post('/attempts/:id/reveal-solution', requireAuth, (req, res) => {
  const attempt = db.prepare(
    'SELECT * FROM attempts WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });

  const progress = getOrCreateProgress(req.user.id, attempt.question_id);
  if (progress.hints_revealed < 1) {
    return res.status(403).json({ error: 'View Hint 1 first before jumping to the full solution.' });
  }

  const question = db.prepare('SELECT full_solution FROM questions WHERE id = ?').get(attempt.question_id);
  res.json({ full_solution: question.full_solution });
});

// Student marks a question Mastered / Needs Practice after seeing the solution.
router.patch('/attempts/:id/mastery', requireAuth, (req, res) => {
  const { mastered_flag } = req.body;
  if (!['Mastered', 'Needs Practice'].includes(mastered_flag)) {
    return res.status(400).json({ error: "mastered_flag must be 'Mastered' or 'Needs Practice'." });
  }
  const result = db.prepare(
    'UPDATE attempts SET mastered_flag = ? WHERE id = ? AND user_id = ?'
  ).run(mastered_flag, req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Attempt not found.' });
  res.json({ ok: true });
});

module.exports = router;
