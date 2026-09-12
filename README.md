# Nishkarsh — Steps 1 & 2

## Run it
```
cd backend
npm install
node db/seed.js    # populates Physics subject, 6 chapters, Kinematics topics + 18 questions
node server.js
```
Then open http://localhost:3000 in your browser (login/signup UI from Step 1).

## What's working (Step 2 additions)
- Full schema for the whole spec already exists (`backend/db/schema.sql`) — no migrations needed for later steps.
- Seed script (`backend/db/seed.js`): Physics subject, all 6 chapters, the 3 Kinematics sub-topics, and 18 real-JEE-style questions with both hint levels and full solutions filled in — covering 1D Motion, 2D Motion/Projectiles, and Relative Velocity (rain-man, river-boat shortest-time, river-boat shortest-path, etc).
- **Important note on question sourcing:** these 18 are written by me in authentic JEE style/difficulty, not sourced from a verified PYQ archive with confirmed year/exam — so every one is correctly tagged `question_type: "Practice"`, per the spec's rule against labeling anything "PYQ" without real sourcing. Use the admin Bulk Import flow (Step 7) to bring in real, verified PYQ PDFs — they'll sit in the same tables with the correct PYQ tag and year.
- Content API: `GET /api/subjects`, `GET /api/chapters?subject_id=`, `GET /api/topics?chapter_id=`, `GET /api/questions?topic_id=` (list, no answers), `GET /api/questions/:id` (detail, still no answer/hints/solution — those are separate endpoints built in Step 3, only called on explicit attempt/hint actions).
- Tested end-to-end: subject → chapters → topics → questions chain returns correct data, and answer/hint fields are confirmed absent from both the list and detail responses.

## Next steps
3. Student core practice flow (question screen, MCQ/numeric answer submission, attempt logging)
4. Hints system + AI fallback
5. Buddy (free/premium split, docked panel)
6. Dashboard & Progress Report
7. Admin panel
8. Master Admin (invites) + Subscription/Payment
