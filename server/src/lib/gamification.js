import db from '../db.js';
import { getSettings, DEFAULT_POINTS } from '../auth.js';

function pointsConfig() {
  const s = getSettings();
  return { ...DEFAULT_POINTS, ...(s.points || {}) };
}

// Idempotent point award: UNIQUE(user_id, reason, ref_type, ref_id)
export function awardPoints(userId, reason, refType = null, refId = null, points = null) {
  const cfg = pointsConfig();
  const amount = points ?? cfg[reason] ?? 10;
  if (!amount) return { awarded: false };
  const res = db.prepare(
    'INSERT OR IGNORE INTO points_transactions (user_id, points, reason, ref_type, ref_id) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, amount, reason, refType, refId == null ? null : String(refId));
  return { awarded: res.changes > 0, points: amount };
}

export function getTotalPoints(userId) {
  const r = db.prepare('SELECT COALESCE(SUM(points),0) AS t FROM points_transactions WHERE user_id = ?').get(userId);
  return r.t;
}

export function getLevel(points) {
  const levels = [
    { min: 0, name_ar: 'مبتدئة العلوم', name_en: 'Science Beginner', icon: '🌱' },
    { min: 200, name_ar: 'مستكشفة', name_en: 'Science Explorer', icon: '🔭' },
    { min: 600, name_ar: 'متخصصة', name_en: 'Science Specialist', icon: '🧪' },
    { min: 1200, name_ar: 'خبيرة', name_en: 'Science Expert', icon: '⚗️' },
    { min: 2000, name_ar: 'بطلة العلوم', name_en: 'Science Champion', icon: '🏆' },
  ];
  let lvl = levels[0];
  for (const l of levels) if (points >= l.min) lvl = l;
  return lvl;
}

export function issueCertificate(userId, type, titleAr, refType = null, refId = null) {
  const exists = db.prepare('SELECT id FROM certificates WHERE user_id=? AND type=? AND ref_type IS ? AND ref_id IS ?')
    .get(userId, type, refType, refId == null ? null : String(refId));
  if (exists) return exists.id;
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const certNumber = `SCI-${year}-${rand}`;
  const info = db.prepare('INSERT INTO certificates (user_id, type, title_ar, ref_type, ref_id, cert_number) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, type, titleAr, refType, refId == null ? null : String(refId), certNumber);
  return info.lastInsertRowid;
}

export function checkBadges(userId) {
  const badges = db.prepare('SELECT * FROM badges').all();
  const earned = new Set(db.prepare('SELECT badge_id FROM student_badges WHERE user_id=?').all(userId).map(r => r.badge_id));
  const points = getTotalPoints(userId);
  const stationsMastered = db.prepare("SELECT COUNT(*) c FROM station_progress WHERE user_id=? AND status='mastered'").get(userId).c;
  const stationsCompleted = db.prepare("SELECT COUNT(*) c FROM station_progress WHERE user_id=? AND status IN ('completed','mastered')").get(userId).c;
  const mockBest = db.prepare("SELECT MAX(percentage) p FROM assessment_attempts a JOIN assessments s ON s.id=a.assessment_id WHERE a.user_id=? AND s.type='mock' AND a.status='submitted'").get(userId).p || 0;
  const ecoMastery = db.prepare("SELECT AVG(mastery) m FROM student_outcomes WHERE user_id=? AND station_id IN (SELECT id FROM stations WHERE slug IN ('environment','web-of-life','planet-guardians'))").get(userId).m || 0;
  const spaceMastery = db.prepare("SELECT AVG(mastery) m FROM student_outcomes WHERE user_id=? AND station_id=(SELECT id FROM stations WHERE slug='space-explorers')").get(userId).m || 0;

  const newly = [];
  for (const b of badges) {
    if (earned.has(b.id)) continue;
    let cond = {};
    try { cond = JSON.parse(b.condition_json); } catch {}
    let ok = false;
    if (cond.type === 'points' && points >= (cond.value || 0)) ok = true;
    else if (cond.type === 'stations_completed' && stationsCompleted >= (cond.value || 0)) ok = true;
    else if (cond.type === 'stations_mastered' && stationsMastered >= (cond.value || 0)) ok = true;
    else if (cond.type === 'mock_score' && mockBest >= (cond.value || 0)) ok = true;
    else if (cond.type === 'station_mastery' && cond.station_slug) {
      const row = db.prepare("SELECT mastery FROM student_outcomes WHERE user_id=? AND station_id=(SELECT id FROM stations WHERE slug=?)").get(userId, cond.station_slug);
      if (row && row.mastery >= (cond.value || 80)) ok = true;
    } else if (cond.type === 'avg_mastery' && cond.group === 'eco' && ecoMastery >= (cond.value || 80)) ok = true;
    else if (cond.type === 'avg_mastery' && cond.group === 'space' && spaceMastery >= (cond.value || 80)) ok = true;
    if (ok) {
      db.prepare('INSERT OR IGNORE INTO student_badges (user_id, badge_id) VALUES (?, ?)').run(userId, b.id);
      newly.push(b);
    }
  }
  return newly;
}

// Update per-outcome mastery from a station assessment attempt
export function updateMasteryFromAttempt(attemptId) {
  const attempt = db.prepare('SELECT * FROM assessment_attempts WHERE id=?').get(attemptId);
  if (!attempt) return;
  const assessment = db.prepare('SELECT * FROM assessments WHERE id=?').get(attempt.assessment_id);
  if (!assessment || assessment.type !== 'station') return;

  const rows = db.prepare(`
    SELECT q.outcome, sa.is_correct
    FROM student_answers sa JOIN questions q ON q.id = sa.question_id
    WHERE sa.attempt_id = ? AND q.station_id = ? AND q.outcome IS NOT NULL
  `).all(attemptId, assessment.station_id);

  const byOutcome = {};
  for (const r of rows) {
    (byOutcome[r.outcome] ||= []).push(r.is_correct ? 100 : 0);
  }
  const upsert = db.prepare(`
    INSERT INTO student_outcomes (user_id, station_id, outcome, mastery, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, station_id, outcome) DO UPDATE SET mastery = excluded.mastery, updated_at = excluded.updated_at
  `);
  for (const [outcome, scores] of Object.entries(byOutcome)) {
    const mastery = scores.reduce((a, b) => a + b, 0) / scores.length;
    upsert.run(attempt.user_id, assessment.station_id, outcome, mastery);
  }

  // station status
  const pct = attempt.percentage || 0;
  const threshold = db.prepare('SELECT mastery_threshold FROM stations WHERE id=?').get(assessment.station_id)?.mastery_threshold || 80;
  const status = pct >= threshold ? 'mastered' : pct >= 60 ? 'completed' : 'in_progress';
  db.prepare(`
    INSERT INTO station_progress (user_id, station_id, status, best_score, completed_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, station_id) DO UPDATE SET
      status = CASE WHEN excluded.best_score > COALESCE(station_progress.best_score, -1) THEN excluded.status ELSE station_progress.status END,
      best_score = MAX(COALESCE(station_progress.best_score, -1), excluded.best_score),
      completed_at = COALESCE(station_progress.completed_at, excluded.completed_at)
  `).run(attempt.user_id, assessment.station_id, status, pct);

  if (pct >= threshold) {
    awardPoints(attempt.user_id, 'station_mastery', 'station', assessment.station_id);
    const station = db.prepare('SELECT title_ar FROM stations WHERE id=?').get(assessment.station_id);
    issueCertificate(attempt.user_id, 'station', `إتقان محطة: ${station?.title_ar}`, 'station', assessment.station_id);
  }
}

export function awardActivity(userId, type, id, score = null) {
  const ins = db.prepare(`
    INSERT OR IGNORE INTO activity_progress (user_id, activity_type, activity_id, score)
    VALUES (?, ?, ?, ?)
  `).run(userId, type, id, score);
  if (ins.changes === 0) return { awarded: false, alreadyCompleted: true };
  const reason = type === 'experiment' ? 'experiment_complete' : 'game_complete';
  const pts = awardPoints(userId, reason, type, id);
  return { awarded: pts.awarded, points: pts.points };
}
