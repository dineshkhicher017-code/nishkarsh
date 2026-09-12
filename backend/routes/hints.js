const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getOrCreateProgress, ensureHintContent } = require('../services/hintState');

const router = express.Router();

// Current hint/attempt state for this student on this question.
router.get('/questions/:id/progress', requireAuth, (req, res) => {
  const progress = getOrCreateProgress(req.user.id, req.params.id);
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!question) return res.status(404).json({ error: 'Question not found.' });

  res.json({
    hints_revealed: progress.hints_revealed,
    wrong_attempts: progress.wrong_attempts,
    root_cause_active: !!progress.root_cause_active,
    hint_1: progress.hints_revealed >= 1 ? question.hint_1 : null,
    hint_2: progress.hints_revealed >= 2 ? question.hint_2 : null,
  });
});

// Voluntary "Need a hint?" click — always available, per CHANGE 2.
// 1st click -> Hint 1, 2nd click -> Hint 2. Shares state with the
// wrong-answer-triggered path (same question_progress row).
router.post('/questions/:id/reveal-hint', requireAuth, async (req, res) => {
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!question) return res.status(404).json({ error: 'Question not found.' });

  const progress = getOrCreateProgress(req.user.id, req.params.id);
  if (progress.hints_revealed >= 2) {
    return res.json({
      hints_revealed: 2,
      hint_1: question.hint_1,
      hint_2: question.hint_2,
      message: 'Both hints are already unlocked for this question.',
    });
  }

  const nextLevel = progress.hints_revealed + 1;

  let content;
  try {
    content = await ensureHintContent(question);
  } catch (err) {
    if (err.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'This question has no hint written yet, and no AI key is configured to generate one. Add ANTHROPIC_API_KEY in backend/.env, or fill hint_1/hint_2 in for this question via the admin panel.',
      });
    }
    return res.status(502).json({ error: 'Hint generation failed: ' + err.message });
  }

  db.prepare(
    'UPDATE question_progress SET hints_revealed = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND question_id = ?'
  ).run(nextLevel, req.user.id, req.params.id);

  res.json({
    hints_revealed: nextLevel,
    hint_1: content.hint_1,
    hint_2: nextLevel >= 2 ? content.hint_2 : null,
  });
});

module.exports = router;
