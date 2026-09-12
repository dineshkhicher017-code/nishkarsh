-- NISHKARSH — full schema, per the master spec (v4 + Change 6/7/8)
-- Built in Step 1; only `users` is wired up to real routes so far.

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT,                          -- null if Google sign-in only
  google_id       TEXT UNIQUE,
  role            TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin','master_admin')),
  subscription_status TEXT NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free','premium')),
  subscription_expiry DATETIME,
  invite_status   TEXT CHECK (invite_status IN ('pending','active')),   -- admins only
  invited_by      INTEGER REFERENCES users(id),
  invite_token    TEXT,
  invite_expiry   DATETIME,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  code  TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chapters (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  name       TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS topics (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id),
  name       TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS questions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id       INTEGER NOT NULL REFERENCES topics(id),
  question_text  TEXT NOT NULL,
  question_image TEXT,
  options_json   TEXT,                      -- JSON array of 4 options, or null if numeric
  correct_answer TEXT NOT NULL,
  question_type  TEXT NOT NULL CHECK (question_type IN ('PYQ','Practice')),
  year           INTEGER,
  exam_type      TEXT CHECK (exam_type IN ('Main','Advanced')),
  core_topic     TEXT,
  prerequisites_json TEXT,                  -- JSON array of strings
  difficulty     TEXT NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
  hint_1         TEXT,
  hint_2         TEXT,
  full_solution  TEXT,
  needs_review   INTEGER DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attempts (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id),
  question_id        INTEGER NOT NULL REFERENCES questions(id),
  core_topic         TEXT,
  prerequisites_json TEXT,
  selected_answer    TEXT,
  is_correct         INTEGER,
  time_taken_seconds INTEGER,
  hints_used         INTEGER DEFAULT 0,
  mastered_flag      TEXT CHECK (mastered_flag IN ('Mastered','Needs Practice')),
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  page_context TEXT,
  message      TEXT NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id),
  plan               TEXT,
  start_date         DATETIME,
  end_date           DATETIME,
  status             TEXT,
  payment_reference_id TEXT
);

CREATE TABLE IF NOT EXISTS question_progress (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  question_id     INTEGER NOT NULL REFERENCES questions(id),
  hints_revealed  INTEGER NOT NULL DEFAULT 0,   -- 0, 1, or 2 — shared state for voluntary AND wrong-answer-triggered paths
  wrong_attempts  INTEGER NOT NULL DEFAULT 0,
  root_cause_active INTEGER NOT NULL DEFAULT 0,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS platform_config (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),   -- singleton
  subscription_live  INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO platform_config (id, subscription_live) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS payment_account_config (
  id                    INTEGER PRIMARY KEY CHECK (id = 1),  -- singleton
  gateway                TEXT,
  account_holder_name    TEXT,
  account_number_masked  TEXT,
  ifsc_or_upi_masked     TEXT,
  verification_status    TEXT DEFAULT 'pending',
  payout_enabled         INTEGER DEFAULT 0
);
