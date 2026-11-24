import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const raw = new DatabaseSync(path.join(dataDir, 'science.db'));
raw.exec('PRAGMA journal_mode = WAL');
raw.exec('PRAGMA foreign_keys = ON');

function normalizeRun(r) {
  return {
    changes: Number(r.changes),
    lastInsertRowid: r.lastInsertRowid == null ? null : Number(r.lastInsertRowid),
  };
}

const db = {
  prepare(sql) {
    const stmt = raw.prepare(sql);
    return {
      run: (...args) => normalizeRun(stmt.run(...args)),
      get: (...args) => stmt.get(...args),
      all: (...args) => stmt.all(...args),
    };
  },
  exec(sql) { return raw.exec(sql); },
  transaction(fn) {
    return (...args) => {
      raw.exec('BEGIN IMMEDIATE');
      try {
        const result = fn(...args);
        raw.exec('COMMIT');
        return result;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    };
  },
};

raw.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('teacher','student')),
  class_id INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  grade TEXT DEFAULT 'الصف السادس',
  academic_year TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS academic_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year TEXT NOT NULL UNIQUE,
  is_current INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_index INTEGER NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  objectives_ar TEXT,
  outcomes_ar TEXT,
  strategy TEXT,
  color TEXT DEFAULT '#168B9A',
  icon TEXT DEFAULT '🔬',
  mastery_threshold INTEGER NOT NULL DEFAULT 80,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  config TEXT NOT NULL DEFAULT '{}',
  points INTEGER NOT NULL DEFAULT 20,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description_ar TEXT,
  instructions_ar TEXT,
  config TEXT NOT NULL DEFAULT '{}',
  points INTEGER NOT NULL DEFAULT 20,
  station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS experiments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  objective_ar TEXT,
  materials_ar TEXT,
  instructions_ar TEXT,
  explanation_ar TEXT,
  config TEXT NOT NULL DEFAULT '{}',
  points INTEGER NOT NULL DEFAULT 30
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
  domain TEXT,
  outcome TEXT,
  difficulty INTEGER NOT NULL DEFAULT 2 CHECK(difficulty BETWEEN 1 AND 4),
  type TEXT NOT NULL DEFAULT 'multiple_choice',
  text_ar TEXT NOT NULL,
  explanation_ar TEXT,
  source TEXT DEFAULT 'teacher',
  review_status TEXT NOT NULL DEFAULT 'approved' CHECK(review_status IN ('draft','approved','rejected')),
  image_url TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS question_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text_ar TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  station_id INTEGER REFERENCES stations(id) ON DELETE CASCADE,
  question_count INTEGER NOT NULL DEFAULT 10,
  time_limit_min INTEGER NOT NULL DEFAULT 20,
  show_immediate_feedback INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assessment_questions (
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (assessment_id, question_id)
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at TEXT,
  score INTEGER,
  total INTEGER,
  percentage REAL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted','expired'))
);

CREATE TABLE IF NOT EXISTS student_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_id INTEGER,
  is_correct INTEGER,
  UNIQUE(attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS station_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('locked','available','in_progress','completed','mastered')),
  best_score REAL,
  completed_at TEXT,
  PRIMARY KEY (user_id, station_id)
);

CREATE TABLE IF NOT EXISTS activity_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_id INTEGER NOT NULL,
  score REAL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, activity_type, activity_id)
);

CREATE TABLE IF NOT EXISTS student_outcomes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  mastery REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, station_id, outcome)
);

CREATE TABLE IF NOT EXISTS points_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, reason, ref_type, ref_id)
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description_ar TEXT,
  icon TEXT DEFAULT '🏅',
  condition_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS student_badges (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS competitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_ar TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'individual',
  question_count INTEGER NOT NULL DEFAULT 20,
  time_limit_min INTEGER NOT NULL DEFAULT 15,
  start_at TEXT,
  end_at TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','active','finished','archived')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS competition_assessments (
  competition_id INTEGER PRIMARY KEY REFERENCES competitions(id) ON DELETE CASCADE,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS competition_participants (
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id INTEGER REFERENCES assessments(id) ON DELETE SET NULL,
  score REAL NOT NULL DEFAULT 0,
  finished_at TEXT,
  PRIMARY KEY (competition_id, user_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_ar TEXT NOT NULL,
  body_ar TEXT,
  audience TEXT NOT NULL DEFAULT 'all' CHECK(audience IN ('all','students','teachers')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  cert_number TEXT UNIQUE NOT NULL,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, type, ref_type, ref_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_station ON questions(station_id, review_status);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_points_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_answers_attempt ON student_answers(attempt_id);
`);

export default db;
