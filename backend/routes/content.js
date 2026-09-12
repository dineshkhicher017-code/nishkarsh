const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/subjects', (req, res) => {
  const subjects = db.prepare('SELECT * FROM subjects ORDER BY sort_order').all();
  res.json({ subjects });
});

router.get('/chapters', (req, res) => {
  const { subject_id } = req.query;
  if (!subject_id) return res.status(400).json({ error: 'subject_id is required.' });
  const chapters = db.prepare(
    'SELECT * FROM chapters WHERE subject_id = ? ORDER BY sort_order'
  ).all(subject_id);
  res.json({ chapters });
});

router.get('/topics', (req, res) => {
  const { chapter_id } = req.query;
  if (!chapter_id) return res.status(400).json({ error: 'chapter_id is required.' });
  const topics = db.prepare(
    'SELECT * FROM topics WHERE chapter_id = ? ORDER BY sort_order'
  ).all(chapter_id);
  res.json({ topics });
});

// List questions for a topic — strips answer/hints/solution so the list
// view can't be used to peek at answers before attempting.
router.get('/questions', (req, res) => {
  const { topic_id } = req.query;
  if (!topic_id) return res.status(400).json({ error: 'topic_id is required.' });
  const rows = db.prepare(
    `SELECT id, question_type, year, exam_type, difficulty, core_topic, prerequisites_json
     FROM questions WHERE topic_id = ? ORDER BY id`
  ).all(topic_id);
  const questions = rows.map((r) => ({
    ...r,
    prerequisites: r.prerequisites_json ? JSON.parse(r.prerequisites_json) : [],
    prerequisites_json: undefined,
  }));
  res.json({ questions });
});

// Full question detail — options + text, but still no correct_answer/hints/
// solution here; those are separate endpoints so the client only fetches
// them on explicit "need a hint" / "submit" actions (Step 3 will use this).
router.get('/questions/:id', (req, res) => {
  const row = db.prepare(
    `SELECT id, topic_id, question_text, question_image, options_json,
            question_type, year, exam_type, difficulty, core_topic, prerequisites_json
     FROM questions WHERE id = ?`
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Question not found.' });
  res.json({
    question: {
      ...row,
      options: row.options_json ? JSON.parse(row.options_json) : null,
      prerequisites: row.prerequisites_json ? JSON.parse(row.prerequisites_json) : [],
      options_json: undefined,
      prerequisites_json: undefined,
    },
  });
});

module.exports = router;
