import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../auth.js';
import { getTotalPoints, getLevel, checkBadges, issueCertificate } from '../lib/gamification.js';
import { certificatePrintHtml } from '../lib/certPrint.js';

const router = Router();
router.use(authRequired);

// ---------- Student dashboard ----------
router.get('/dashboard', (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'لوحة الطالبة فقط' });
  const uid = req.user.id;

  const points = getTotalPoints(uid);
  const level = getLevel(points);

  const stations = db.prepare('SELECT id, slug, title_ar, title_en, icon, color, order_index, mastery_threshold FROM stations WHERE active=1 ORDER BY order_index').all();
  const progressRows = db.prepare('SELECT * FROM station_progress WHERE user_id=?').all(uid);
  const progMap = {};
  for (const p of progressRows) progMap[p.station_id] = p;

  const stationStates = stations.map(s => {
    const p = progMap[s.id];
    let status = 'locked';
    if (p) status = p.status;
    else {
      // first station always available; others available if previous completed
      const prev = stations.find(x => x.order_index === s.order_index - 1);
      if (!prev) status = 'available';
      else {
        const pp = progMap[prev.id];
        status = pp && ['completed', 'mastered'].includes(pp.status) ? 'available' : 'locked';
      }
    }
    return { ...s, status, best_score: p?.best_score ?? null };
  });

  const badges = db.prepare(`
    SELECT b.*, sb.earned_at FROM student_badges sb JOIN badges b ON b.id=sb.badge_id
    WHERE sb.user_id=? ORDER BY sb.earned_at DESC`).all(uid);
  const allBadges = db.prepare('SELECT * FROM badges').all();

  const recentAttempts = db.prepare(`
    SELECT t.id, t.percentage, t.submitted_at, a.title_ar, a.type
    FROM assessment_attempts t JOIN assessments a ON a.id=t.assessment_id
    WHERE t.user_id=? AND t.status='submitted' ORDER BY t.id DESC LIMIT 5`).all(uid);

  const announcements = db.prepare(`
    SELECT * FROM announcements WHERE audience IN ('all','students') ORDER BY id DESC LIMIT 5`).all();

  const masteryRows = db.prepare('SELECT AVG(mastery) m FROM student_outcomes WHERE user_id=?').get(uid);
  const avgMastery = masteryRows.m ? Math.round(masteryRows.m) : 0;

  const upcoming = db.prepare(`
    SELECT * FROM competitions WHERE status IN ('scheduled','active') AND (start_at IS NULL OR start_at <= datetime('now'))
    ORDER BY start_at LIMIT 5`).all();

  // remedial recommendations: weakest outcomes
  const weak = db.prepare(`
    SELECT so.station_id, so.outcome, so.mastery, s.title_ar, s.slug
    FROM student_outcomes so JOIN stations s ON s.id=so.station_id
    WHERE so.user_id=? AND so.mastery < 80 ORDER BY so.mastery ASC LIMIT 5`).all(uid);

  res.json({
    user: req.user,
    points,
    level,
    avg_mastery: avgMastery,
    stations: stationStates,
    badges,
    all_badges: allBadges,
    recent_attempts: recentAttempts,
    announcements,
    upcoming_competitions: upcoming,
    remedial: weak,
  });
});

// ---------- Achievements ----------
router.get('/achievements', (req, res) => {
  const uid = req.user.id;
  const earned = db.prepare(`SELECT b.*, sb.earned_at FROM student_badges sb JOIN badges b ON b.id=sb.badge_id WHERE sb.user_id=?`).all(uid);
  const all = db.prepare('SELECT * FROM badges').all();
  const earnedIds = new Set(earned.map(e => e.id));
  res.json({ earned, locked: all.filter(b => !earnedIds.has(b.id)) });
});

// ---------- Certificates ----------
router.get('/certificates', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, u.display_name FROM certificates c JOIN users u ON u.id=c.user_id
    WHERE c.user_id=? ORDER BY c.issued_at DESC`).all(req.user.id);
  res.json(rows);
});

// Student prints own certificate (teacher can print any)
router.get('/certificates/:id/print', (req, res) => {
  const cert = db.prepare('SELECT user_id FROM certificates WHERE id=?').get(req.params.id);
  if (!cert) return res.status(404).send('not found');
  if (req.user.role !== 'teacher' && cert.user_id !== req.user.id) return res.status(403).send('forbidden');
  const html = certificatePrintHtml(req.params.id);
  if (!html) return res.status(404).send('not found');
  res.type('html').send(html);
});

// ---------- Leaderboard (display names + class only, no personal data) ----------
router.get('/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.display_name, u.class_id, c.name AS class_name,
      COALESCE((SELECT SUM(points) FROM points_transactions WHERE user_id=u.id),0) AS points
    FROM users u LEFT JOIN classes c ON c.id=u.class_id
    WHERE u.role='student' AND u.active=1
    ORDER BY points DESC LIMIT 50`).all();
  res.json(rows.map((r, i) => ({ rank: i + 1, display_name: r.display_name, class_name: r.class_name, points: r.points })));
});

// ---------- Announcements ----------
router.get('/announcements', (req, res) => {
  const aud = req.user.role === 'teacher' ? 'all' : "IN ('all','students')";
  const rows = req.user.role === 'teacher'
    ? db.prepare("SELECT * FROM announcements WHERE audience IN ('all','teachers') ORDER BY id DESC LIMIT 50").all()
    : db.prepare("SELECT * FROM announcements WHERE audience IN ('all','students') ORDER BY id DESC LIMIT 50").all();
  res.json(rows);
});

// Teacher posts announcement
router.post('/announcements', authRequired, (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'للمعلمة فقط' });
  const { title_ar, body_ar, audience } = req.body || {};
  if (!title_ar) return res.status(400).json({ error: 'العنوان مطلوب' });
  const info = db.prepare('INSERT INTO announcements (title_ar, body_ar, audience, created_by) VALUES (?,?,?,?)')
    .run(title_ar, body_ar || '', audience || 'all', req.user.id);
  res.json({ id: info.lastInsertRowid });
});

export default router;
