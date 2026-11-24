import { Router } from 'express';
import db from '../db.js';
import { authRequired, requireStudent } from '../auth.js';
import { awardPoints, updateMasteryFromAttempt, checkBadges, awardActivity } from '../lib/gamification.js';
import { syncCompetitionScore } from './competitions.js';

const router = Router();
router.use(authRequired);
// All routes except GET '/' (assessment list, also used by teachers) are student-only
router.use((req, res, next) => {
  if (req.method === 'GET' && req.path === '/') return next();
  return requireStudent(req, res, next);
});

// List assessments available to student + their best attempt
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, s.title_ar AS station_title_ar, s.slug AS station_slug,
      (SELECT MAX(percentage) FROM assessment_attempts t WHERE t.assessment_id=a.id AND t.user_id=? AND t.status='submitted') AS best_percentage,
      (SELECT COUNT(*) FROM assessment_attempts t WHERE t.assessment_id=a.id AND t.user_id=? AND t.status='submitted') AS attempts_count
    FROM assessments a LEFT JOIN stations s ON s.id=a.station_id
    WHERE a.status='published' ORDER BY a.id DESC`).all(req.user.id, req.user.id);
  res.json(rows);
});

// Start or resume an attempt
router.post('/:id/start', (req, res) => {
  const assessment = db.prepare("SELECT * FROM assessments WHERE id=? AND status='published'").get(req.params.id);
  if (!assessment) return res.status(404).json({ error: 'الاختبار غير موجود' });

  // Latest attempt for this assessment+user
  let attempt = db.prepare('SELECT * FROM assessment_attempts WHERE assessment_id=? AND user_id=? ORDER BY id DESC LIMIT 1').get(assessment.id, req.user.id);
  if (attempt && attempt.status === 'in_progress') {
    return res.json({ attempt_id: attempt.id, started_at: attempt.started_at, time_limit_min: assessment.time_limit_min });
  }
  // Official assessments (competition/mock/final/diagnostic) allow only one attempt
  const oneShot = ['competition', 'mock', 'final', 'diagnostic'].includes(assessment.type);
  if (attempt && attempt.status === 'submitted' && oneShot) {
    return res.status(400).json({ error: 'لقد أكمتِ هذا الاختبار بالفعل', attempt_id: attempt.id });
  }
  if (!attempt || attempt.status === 'submitted') {
    // ensure questions exist
    const count = db.prepare('SELECT COUNT(*) c FROM assessment_questions WHERE assessment_id=?').get(assessment.id).c;
    if (count === 0) return res.status(400).json({ error: 'لا توجد أسئلة في هذا الاختبار' });
    const info = db.prepare("INSERT INTO assessment_attempts (assessment_id, user_id) VALUES (?, ?)").run(assessment.id, req.user.id);
    attempt = db.prepare('SELECT * FROM assessment_attempts WHERE id=?').get(info.lastInsertRowid);
  }
  res.json({ attempt_id: attempt.id, started_at: attempt.started_at, time_limit_min: assessment.time_limit_min });
});

// Get questions for an attempt — answers NEVER included
router.get('/attempts/:attemptId/questions', (req, res) => {
  const attempt = db.prepare('SELECT * FROM assessment_attempts WHERE id=? AND user_id=?').get(req.params.attemptId, req.user.id);
  if (!attempt) return res.status(404).json({ error: 'المحاولة غير موجودة' });
  if (attempt.status === 'submitted') return res.status(400).json({ error: 'تم تسليم هذا الاختبار' });

  const assessment = db.prepare('SELECT * FROM assessments WHERE id=?').get(attempt.assessment_id);

  // expiry check
  const elapsed = (Date.now() - new Date(attempt.started_at.replace(' ', 'T') + 'Z').getTime()) / 60000;
  if (elapsed > assessment.time_limit_min + 5) {
    autoSubmit(attempt.id);
    return res.status(400).json({ error: 'انتهى وقت الاختبار' });
  }

  const questions = db.prepare(`
    SELECT q.id, q.text_ar, q.type, q.difficulty, q.image_url, q.outcome,
      (SELECT json_group_array(json_object('id',o.id,'text_ar',o.text_ar,'order_index',o.order_index)) FROM question_options o WHERE o.question_id=q.id) options_json,
      aq.order_index
    FROM assessment_questions aq JOIN questions q ON q.id=aq.question_id
    WHERE aq.assessment_id=? ORDER BY aq.order_index`).all(attempt.assessment_id);

  const answers = db.prepare('SELECT question_id, selected_option_id FROM student_answers WHERE attempt_id=?').all(attempt.id);
  const answerMap = {};
  for (const a of answers) answerMap[a.question_id] = a.selected_option_id;

  res.json({
    assessment: { id: assessment.id, title_ar: assessment.title_ar, type: assessment.type, time_limit_min: assessment.time_limit_min, show_immediate_feedback: assessment.show_immediate_feedback },
    questions: questions.map(q => {
      let options = [];
      try { options = JSON.parse(q.options_json || '[]'); } catch {}
      // shuffle options server-side deterministically per attempt for fairness
      options = shuffle(options, attempt.id * 31 + q.id);
      return {
        id: q.id, text_ar: q.text_ar, type: q.type, difficulty: q.difficulty, image_url: q.image_url, outcome: q.outcome,
        options: options.map(o => ({ id: o.id, text_ar: o.text_ar })),
        selected_option_id: answerMap[q.id] ?? null,
      };
    }),
  });
});

// Save an answer (autosave)
router.post('/attempts/:attemptId/answer', (req, res) => {
  const { question_id, option_id } = req.body || {};
  const attempt = db.prepare('SELECT * FROM assessment_attempts WHERE id=? AND user_id=?').get(req.params.attemptId, req.user.id);
  if (!attempt || attempt.status !== 'in_progress') return res.status(400).json({ error: 'المحاولة غير صالحة' });

  // verify question belongs to this assessment
  const belongs = db.prepare('SELECT 1 FROM assessment_questions WHERE assessment_id=? AND question_id=?').get(attempt.assessment_id, question_id);
  if (!belongs) return res.status(400).json({ error: 'سؤال غير صالح' });

  const opt = db.prepare('SELECT is_correct FROM question_options WHERE id=? AND question_id=?').get(option_id, question_id);
  if (!opt) return res.status(400).json({ error: 'خيار غير صالح' });

  db.prepare(`INSERT INTO student_answers (attempt_id, question_id, selected_option_id, is_correct) VALUES (?,?,?,?)
    ON CONFLICT(attempt_id, question_id) DO UPDATE SET selected_option_id=excluded.selected_option_id, is_correct=excluded.is_correct`)
    .run(attempt.id, question_id, option_id, opt.is_correct ? 1 : 0);
  res.json({ ok: true });
});

// Submit attempt
router.post('/attempts/:attemptId/submit', (req, res) => {
  const attempt = db.prepare('SELECT * FROM assessment_attempts WHERE id=? AND user_id=?').get(req.params.attemptId, req.user.id);
  if (!attempt) return res.status(404).json({ error: 'المحاولة غير موجودة' });
  if (attempt.status === 'submitted') return res.json(getResult(attempt.id));
  const result = autoSubmit(attempt.id);
  res.json(result);
});

function autoSubmit(attemptId) {
  const attempt = db.prepare('SELECT * FROM assessment_attempts WHERE id=?').get(attemptId);
  const total = db.prepare('SELECT COUNT(*) c FROM assessment_questions WHERE assessment_id=?').get(attempt.assessment_id).c;
  const correct = db.prepare('SELECT COUNT(*) c FROM student_answers WHERE attempt_id=? AND is_correct=1').get(attemptId).c;
  const pct = total ? Math.round((correct / total) * 1000) / 10 : 0;
  db.prepare("UPDATE assessment_attempts SET status='submitted', submitted_at=datetime('now'), score=?, total=?, percentage=? WHERE id=?")
    .run(correct, total, pct, attemptId);

  const assessment = db.prepare('SELECT * FROM assessments WHERE id=?').get(attempt.assessment_id);
  awardPoints(attempt.user_id, 'assessment_complete', 'assessment', assessment.id);
  updateMasteryFromAttempt(attemptId);
  syncCompetitionScore({ ...db.prepare('SELECT * FROM assessment_attempts WHERE id=?').get(attemptId), assessment_id: assessment.id });
  checkBadges(attempt.user_id);
  return getResult(attemptId);
}

function getResult(attemptId) {
  const attempt = db.prepare('SELECT * FROM assessment_attempts WHERE id=?').get(attemptId);
  const assessment = db.prepare('SELECT * FROM assessments WHERE id=?').get(attempt.assessment_id);
  const answers = db.prepare(`
    SELECT sa.question_id, sa.selected_option_id, sa.is_correct, q.text_ar, q.explanation_ar,
      (SELECT json_group_array(json_object('id',o.id,'text_ar',o.text_ar,'is_correct',o.is_correct)) FROM question_options o WHERE o.question_id=q.id) options_json
    FROM student_answers sa JOIN questions q ON q.id=sa.question_id WHERE sa.attempt_id=?`).all(attemptId);
  return {
    attempt: { id: attempt.id, score: attempt.score, total: attempt.total, percentage: attempt.percentage, submitted_at: attempt.submitted_at },
    assessment: { id: assessment.id, title_ar: assessment.title_ar, type: assessment.type, station_id: assessment.station_id },
    answers: answers.map(a => {
      let options = [];
      try { options = JSON.parse(a.options_json || '[]'); } catch {}
      return { question_id: a.question_id, text_ar: a.text_ar, explanation_ar: a.explanation_ar, is_correct: !!a.is_correct, selected_option_id: a.selected_option_id, options };
    }),
  };
}

// Attempt history
router.get('/history', (req, res) => {
  const rows = db.prepare(`
    SELECT t.id, t.score, t.total, t.percentage, t.submitted_at, t.status,
      a.id AS assessment_id, a.title_ar, a.type, s.title_ar AS station_title_ar, s.slug AS station_slug
    FROM assessment_attempts t JOIN assessments a ON a.id=t.assessment_id
    LEFT JOIN stations s ON s.id=a.station_id
    WHERE t.user_id=? ORDER BY t.id DESC LIMIT 100`).all(req.user.id);
  res.json(rows);
});

// Result detail
router.get('/attempts/:attemptId/result', (req, res) => {
  const attempt = db.prepare('SELECT * FROM assessment_attempts WHERE id=? AND user_id=?').get(req.params.attemptId, req.user.id);
  if (!attempt) return res.status(404).json({ error: 'المحاولة غير موجودة' });
  if (attempt.status !== 'submitted') return res.status(400).json({ error: 'لم يتم التسليم بعد' });
  res.json(getResult(attempt.id));
});

// ---------- Games & experiments completion (server-authoritative scoring) ----------
router.post('/activity-complete', (req, res) => {
  const { activity_type, activity_id, score } = req.body || {};
  if (!activity_type || activity_id == null) return res.status(400).json({ error: 'بيانات غير كاملة' });
  // validate activity exists
  if (activity_type === 'experiment') {
    const e = db.prepare('SELECT id FROM experiments WHERE id=?').get(activity_id);
    if (!e) return res.status(404).json({ error: 'التجربة غير موجودة' });
  } else if (activity_type === 'game') {
    const g = db.prepare('SELECT id FROM games WHERE id=?').get(activity_id);
    if (!g) return res.status(404).json({ error: 'اللعبة غير موجودة' });
  } else {
    const a = db.prepare('SELECT id FROM activities WHERE id=?').get(activity_id);
    if (!a) return res.status(404).json({ error: 'النشاط غير موجود' });
  }
  const result = awardActivity(req.user.id, activity_type === 'activity' ? 'activity' : activity_type, activity_id, score ?? null);
  const badges = checkBadges(req.user.id);
  res.json({ ...result, new_badges: badges.map(b => ({ id: b.id, title_ar: b.title_ar, icon: b.icon })) });
});

function shuffle(arr, seed) {
  const a = [...arr];
  let s = seed || 1;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default router;
