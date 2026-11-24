import { Router } from 'express';
import db from '../db.js';
import { authRequired, requireTeacher } from '../auth.js';
import { awardPoints, checkBadges } from '../lib/gamification.js';

const router = Router();
router.use(authRequired);

// List competitions (students see active/scheduled; teacher sees all)
router.get('/', (req, res) => {
  const isTeacher = req.user.role === 'teacher';
  const sql = `
    SELECT c.*,
      (SELECT COUNT(*) FROM competition_participants p WHERE p.competition_id=c.id) AS participants,
      (SELECT COUNT(*) FROM competition_participants p WHERE p.competition_id=c.id AND p.user_id=?) AS my_participation
    FROM competitions c
    ${isTeacher ? '' : "WHERE c.status IN ('scheduled','active','finished')"}
    ORDER BY c.id DESC`;
  const rows = db.prepare(sql).all(req.user.id);
  res.json(rows.map(r => ({ ...r, my_participation: r.my_participation > 0 })));
});

// Leaderboard for a competition (top 20, display names only)
router.get('/:id/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT p.score, p.finished_at, u.display_name, c.name AS class_name
    FROM competition_participants p JOIN users u ON u.id=p.user_id
    LEFT JOIN classes c ON c.id=u.class_id
    WHERE p.competition_id=? ORDER BY p.score DESC, p.finished_at ASC LIMIT 20`).all(req.params.id);
  res.json(rows.map((r, i) => ({ rank: i + 1, ...r })));
});

// Teacher: create competition → generates a hidden assessment with random approved questions
router.post('/', requireTeacher, (req, res) => {
  const { title_ar, type, question_count, time_limit_min, start_at, end_at, status } = req.body || {};
  if (!title_ar) return res.status(400).json({ error: 'عنوان المسابقة مطلوب' });
  const count = Math.min(Math.max(parseInt(question_count) || 20, 1), 100);
  const tlim = Math.min(Math.max(parseInt(time_limit_min) || 15, 1), 120);

  const tx = db.transaction(() => {
    const aInfo = db.prepare(`INSERT INTO assessments (type, title_ar, question_count, time_limit_min, show_immediate_feedback, status)
      VALUES ('competition', ?, ?, ?, 0, 'published')`).run(`[مسابقة] ${title_ar}`, count, tlim);
    const assessmentId = aInfo.lastInsertRowid;
    const pool = db.prepare("SELECT id FROM questions WHERE review_status='approved' ORDER BY RANDOM() LIMIT ?").all(count);
    const ins = db.prepare('INSERT OR IGNORE INTO assessment_questions (assessment_id, question_id, order_index) VALUES (?,?,?)');
    pool.forEach((q, i) => ins.run(assessmentId, q.id, i));
    const cInfo = db.prepare(`INSERT INTO competitions (title_ar, type, question_count, time_limit_min, start_at, end_at, status, created_by)
      VALUES (?,?,?,?,?,?,?,?)`).run(title_ar, type || 'individual', count, tlim,
      start_at || null, end_at || null, status || 'scheduled', req.user.id);
    return { competitionId: cInfo.lastInsertRowid, assessmentId };
  });
  const result = tx();
  db.prepare('INSERT INTO competition_assessments (competition_id, assessment_id) VALUES (?,?)').run(result.competitionId, result.assessmentId);
  const qCount = db.prepare('SELECT COUNT(*) c FROM assessment_questions WHERE assessment_id=?').get(result.assessmentId).c;
  res.json({ id: result.competitionId, assessment_id: result.assessmentId, questions: qCount });
});

router.put('/:id', requireTeacher, (req, res) => {
  const { title_ar, status, start_at, end_at } = req.body || {};
  db.prepare('UPDATE competitions SET title_ar=COALESCE(?,title_ar), status=COALESCE(?,status), start_at=COALESCE(?,start_at), end_at=COALESCE(?,end_at) WHERE id=?')
    .run(title_ar ?? null, status ?? null, start_at ?? null, end_at ?? null, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireTeacher, (req, res) => {
  db.prepare('DELETE FROM competitions WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Student: join/start competition → creates participant + returns assessment_id
router.post('/:id/join', (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'للطالبات فقط' });
  const comp = db.prepare('SELECT * FROM competitions WHERE id=?').get(req.params.id);
  if (!comp) return res.status(404).json({ error: 'المسابقة غير موجودة' });
  if (comp.status === 'draft' || comp.status === 'archived') return res.status(400).json({ error: 'المسابقة غير متاحة' });
  const map = db.prepare('SELECT assessment_id FROM competition_assessments WHERE competition_id=?').get(comp.id);
  if (!map) return res.status(400).json({ error: 'المسابقة غير مهيأة' });

  let part = db.prepare('SELECT * FROM competition_participants WHERE competition_id=? AND user_id=?').get(comp.id, req.user.id);
  if (!part) {
    db.prepare('INSERT INTO competition_participants (competition_id, user_id, assessment_id) VALUES (?,?,?)').run(comp.id, req.user.id, map.assessment_id);
    part = db.prepare('SELECT * FROM competition_participants WHERE competition_id=? AND user_id=?').get(comp.id, req.user.id);
  }
  res.json({ assessment_id: map.assessment_id, participant: part });
});

// Called after a competition assessment attempt is submitted: update participant score
export function syncCompetitionScore(attempt) {
  const assessment = db.prepare('SELECT * FROM assessments WHERE id=?').get(attempt.assessment_id);
  if (!assessment || assessment.type !== 'competition') return;
  const map = db.prepare('SELECT * FROM competition_assessments WHERE assessment_id=?').get(assessment.id);
  if (!map) return;
  const part = db.prepare('SELECT * FROM competition_participants WHERE competition_id=? AND user_id=?').get(map.competition_id, attempt.user_id);
  if (!part) return;
  const pct = attempt.percentage || 0;
  // score = percentage; finished if higher than stored
  if (pct >= (part.score || 0)) {
    db.prepare("UPDATE competition_participants SET score=?, finished_at=datetime('now') WHERE competition_id=? AND user_id=?")
      .run(pct, map.competition_id, attempt.user_id);
  }
  // competition points
  awardPoints(attempt.user_id, 'competition_complete', 'competition', map.competition_id);
  checkBadges(attempt.user_id);
}

export default router;
