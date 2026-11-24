import { Router } from 'express';
import db from '../db.js';
import { authRequired, requireTeacher } from '../auth.js';

const router = Router();

// ---------- Stations ----------
router.get('/stations', authRequired, (req, res) => {
  const stations = db.prepare('SELECT * FROM stations WHERE active=1 ORDER BY order_index').all();
  res.json(stations);
});

router.get('/stations/:idOrSlug', authRequired, (req, res) => {
  const key = req.params.idOrSlug;
  const station = isNaN(key)
    ? db.prepare('SELECT * FROM stations WHERE slug=?').get(key)
    : db.prepare('SELECT * FROM stations WHERE id=?').get(key);
  if (!station) return res.status(404).json({ error: 'المحطة غير موجودة' });

  const lessons = db.prepare('SELECT * FROM lessons WHERE station_id=? ORDER BY order_index').all(station.id);
  const activities = db.prepare('SELECT * FROM activities WHERE station_id=? ORDER BY order_index').all(station.id);
  const experiments = db.prepare('SELECT * FROM experiments WHERE station_id=?').all(station.id);
  const assessments = db.prepare("SELECT * FROM assessments WHERE station_id=? AND type='station' AND status='published'").all(station.id);

  let progress = null;
  let outcomes = [];
  if (req.user.role === 'student') {
    progress = db.prepare('SELECT * FROM station_progress WHERE user_id=? AND station_id=?').get(req.user.id, station.id) || null;
    outcomes = db.prepare('SELECT * FROM student_outcomes WHERE user_id=? AND station_id=?').all(req.user.id, station.id);
  }

  res.json({ ...station, lessons, activities, experiments, assessments, progress, outcomes });
});

// Teacher: create/update station
router.post('/stations', authRequired, requireTeacher, (req, res) => {
  const s = req.body || {};
  if (!s.title_ar || !s.slug) return res.status(400).json({ error: 'العنوان والالرابط مطلوبان' });
  const info = db.prepare(`INSERT INTO stations (order_index, slug, title_ar, title_en, description_ar, objectives_ar, outcomes_ar, strategy, color, icon, mastery_threshold)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    s.order_index ?? 0, s.slug, s.title_ar, s.title_en || '', s.description_ar || '', s.objectives_ar || '',
    s.outcomes_ar || '', s.strategy || '', s.color || '#168B9A', s.icon || '🔬', s.mastery_threshold ?? 80);
  res.json({ id: info.lastInsertRowid });
});

router.put('/stations/:id', authRequired, requireTeacher, (req, res) => {
  const s = req.body || {};
  db.prepare(`UPDATE stations SET order_index=?, slug=?, title_ar=?, title_en=?, description_ar=?, objectives_ar=?, outcomes_ar=?, strategy=?, color=?, icon=?, mastery_threshold=?, active=? WHERE id=?`).run(
    s.order_index ?? 0, s.slug, s.title_ar, s.title_en || '', s.description_ar || '', s.objectives_ar || '',
    s.outcomes_ar || '', s.strategy || '', s.color || '#168B9A', s.icon || '🔬', s.mastery_threshold ?? 80, s.active ?? 1, req.params.id);
  res.json({ ok: true });
});

router.post('/stations/:id/lessons', authRequired, requireTeacher, (req, res) => {
  const l = req.body || {};
  const info = db.prepare('INSERT INTO lessons (station_id, title_ar, content_ar, order_index) VALUES (?,?,?,?)')
    .run(req.params.id, l.title_ar, l.content_ar || '', l.order_index ?? 0);
  res.json({ id: info.lastInsertRowid });
});

router.post('/stations/:id/activities', authRequired, requireTeacher, (req, res) => {
  const a = req.body || {};
  const info = db.prepare('INSERT INTO activities (station_id, type, title_ar, config, points, order_index) VALUES (?,?,?,?,?,?)')
    .run(req.params.id, a.type || 'interactive', a.title_ar, JSON.stringify(a.config || {}), a.points ?? 20, a.order_index ?? 0);
  res.json({ id: info.lastInsertRowid });
});

router.post('/stations/:id/experiments', authRequired, requireTeacher, (req, res) => {
  const e = req.body || {};
  const info = db.prepare('INSERT INTO experiments (station_id, title_ar, objective_ar, materials_ar, instructions_ar, explanation_ar, config, points) VALUES (?,?,?,?,?,?,?,?)')
    .run(req.params.id, e.title_ar, e.objective_ar || '', e.materials_ar || '', e.instructions_ar || '', e.explanation_ar || '', JSON.stringify(e.config || {}), e.points ?? 30);
  res.json({ id: info.lastInsertRowid });
});

// ---------- Questions ----------
function sanitizeQuestion(q) {
  return {
    id: q.id, station_id: q.station_id, domain: q.domain, outcome: q.outcome,
    difficulty: q.difficulty, type: q.type, text_ar: q.text_ar, explanation_ar: q.explanation_ar,
    source: q.source, review_status: q.review_status, image_url: q.image_url,
    options: q.options || [],
  };
}

router.get('/questions', authRequired, (req, res) => {
  const { station_id, status, source, q, page = 1, limit = 50 } = req.query;
  let sql = `SELECT q.*, (SELECT json_group_array(json_object('id',o.id,'text_ar',o.text_ar,'is_correct',o.is_correct,'order_index',o.order_index)) FROM question_options o WHERE o.question_id=q.id) AS options_json
             FROM questions q WHERE 1=1`;
  const params = [];
  if (req.user.role === 'student') { sql += " AND q.review_status='approved'"; }
  else {
    if (status) { sql += ' AND q.review_status=?'; params.push(status); }
  }
  if (station_id) { sql += ' AND q.station_id=?'; params.push(station_id); }
  if (source) { sql += ' AND q.source=?'; params.push(source); }
  if (q) { sql += ' AND q.text_ar LIKE ?'; params.push(`%${q}%`); }
  const lim = Math.min(parseInt(limit) || 50, 200);
  const off = (Math.max(parseInt(page) || 1, 1) - 1) * lim;
  const total = db.prepare(`SELECT COUNT(*) c FROM questions q WHERE 1=1 ${req.user.role === 'student' ? "AND q.review_status='approved'" : ''}`).get().c;
  const rows = db.prepare(`${sql} ORDER BY q.id DESC LIMIT ? OFFSET ?`).all(...params, lim, off);
  res.json({
    total,
    questions: rows.map(r => {
      const { options_json, ...rest } = r;
      let options = [];
      try { options = JSON.parse(options_json || '[]'); } catch {}
      return sanitizeQuestion({ ...rest, options });
    }),
  });
});

router.post('/questions', authRequired, requireTeacher, (req, res) => {
  const q = req.body || {};
  if (!q.text_ar) return res.status(400).json({ error: 'نص السؤال مطلوب' });
  const info = db.prepare(`INSERT INTO questions (station_id, domain, outcome, difficulty, type, text_ar, explanation_ar, source, review_status, image_url, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    q.station_id || null, q.domain || null, q.outcome || null, q.difficulty ?? 2, q.type || 'multiple_choice',
    q.text_ar, q.explanation_ar || '', q.source || 'teacher', q.review_status || 'approved', q.image_url || null, req.user.id);
  const qid = info.lastInsertRowid;
  saveOptions(qid, q.options || []);
  res.json({ id: qid });
});

router.put('/questions/:id', authRequired, requireTeacher, (req, res) => {
  const q = req.body || {};
  db.prepare(`UPDATE questions SET station_id=?, domain=?, outcome=?, difficulty=?, type=?, text_ar=?, explanation_ar=?, source=?, review_status=?, image_url=? WHERE id=?`).run(
    q.station_id || null, q.domain || null, q.outcome || null, q.difficulty ?? 2, q.type || 'multiple_choice',
    q.text_ar, q.explanation_ar || '', q.source || 'teacher', q.review_status || 'approved', q.image_url || null, req.params.id);
  db.prepare('DELETE FROM question_options WHERE question_id=?').run(req.params.id);
  saveOptions(req.params.id, q.options || []);
  res.json({ ok: true });
});

router.delete('/questions/:id', authRequired, requireTeacher, (req, res) => {
  db.prepare('DELETE FROM questions WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

function saveOptions(questionId, options) {
  const stmt = db.prepare('INSERT INTO question_options (question_id, text_ar, is_correct, order_index) VALUES (?,?,?,?)');
  (options || []).forEach((o, i) => {
    stmt.run(questionId, o.text_ar, o.is_correct ? 1 : 0, o.order_index ?? i);
  });
}

// ---------- Assessments ----------
router.get('/assessments', authRequired, (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT a.*, s.title_ar AS station_title_ar, s.slug AS station_slug FROM assessments a LEFT JOIN stations s ON s.id=a.station_id WHERE a.status=\'published\'';
  const params = [];
  if (type) { sql += ' AND a.type=?'; params.push(type); }
  sql += ' ORDER BY a.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/assessments', authRequired, requireTeacher, (req, res) => {
  const a = req.body || {};
  if (!a.title_ar || !a.type) return res.status(400).json({ error: 'العنوان والنوع مطلوبان' });
  const info = db.prepare(`INSERT INTO assessments (type, title_ar, station_id, question_count, time_limit_min, show_immediate_feedback, status)
    VALUES (?,?,?,?,?,?,?)`).run(
    a.type, a.title_ar, a.station_id || null, a.question_count ?? 10, a.time_limit_min ?? 20,
    a.show_immediate_feedback ? 1 : 0, a.status || 'published');
  const aid = info.lastInsertRowid;
  // auto-pick questions
  const count = a.question_count ?? 10;
  const where = a.station_id ? 'station_id = ? AND review_status=\'approved\'' : "review_status='approved'";
  const params = a.station_id ? [a.station_id] : [];
  const pool = db.prepare(`SELECT id FROM questions WHERE ${where} ORDER BY RANDOM() LIMIT ?`).all(...params, count * 3);
  const chosen = pool.slice(0, count);
  const ins = db.prepare('INSERT OR IGNORE INTO assessment_questions (assessment_id, question_id, order_index) VALUES (?,?,?)');
  chosen.forEach((q, i) => ins.run(aid, q.id, i));
  res.json({ id: aid, questions_added: chosen.length });
});

router.put('/assessments/:id', authRequired, requireTeacher, (req, res) => {
  const a = req.body || {};
  db.prepare('UPDATE assessments SET title_ar=?, question_count=?, time_limit_min=?, show_immediate_feedback=?, status=? WHERE id=?').run(
    a.title_ar, a.question_count ?? 10, a.time_limit_min ?? 20, a.show_immediate_feedback ? 1 : 0, a.status || 'published', req.params.id);
  res.json({ ok: true });
});

router.delete('/assessments/:id', authRequired, requireTeacher, (req, res) => {
  db.prepare('DELETE FROM assessments WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/assessments/:id/questions', authRequired, requireTeacher, (req, res) => {
  const rows = db.prepare(`
    SELECT q.*, (SELECT json_group_array(json_object('id',o.id,'text_ar',o.text_ar,'is_correct',o.is_correct,'order_index',o.order_index)) FROM question_options o WHERE o.question_id=q.id) options_json
    FROM assessment_questions aq JOIN questions q ON q.id=aq.question_id
    WHERE aq.assessment_id=? ORDER BY aq.order_index`).all(req.params.id);
  res.json(rows.map(r => {
    const { options_json, ...rest } = r;
    let options = [];
    try { options = JSON.parse(options_json || '[]'); } catch {}
    return { ...rest, options };
  }));
});

// ---------- Games ----------
router.get('/games', authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT g.*, s.title_ar AS station_title_ar FROM games g
    LEFT JOIN stations s ON s.id=g.station_id WHERE g.active=1 ORDER BY g.order_index`).all();
  const done = req.user.role === 'student'
    ? new Set(db.prepare("SELECT activity_id FROM activity_progress WHERE user_id=? AND activity_type='game'").all(req.user.id).map(r => r.activity_id))
    : new Set();
  res.json(rows.map(g => ({ ...g, completed: done.has(g.id) })));
});

router.post('/games', authRequired, requireTeacher, (req, res) => {
  const g = req.body || {};
  const info = db.prepare(`INSERT INTO games (slug, title_ar, title_en, description_ar, instructions_ar, config, points, station_id, order_index)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(g.slug, g.title_ar, g.title_en || '', g.description_ar || '', g.instructions_ar || '',
    JSON.stringify(g.config || {}), g.points ?? 20, g.station_id || null, g.order_index ?? 0);
  res.json({ id: info.lastInsertRowid });
});

// ---------- Public platform info ----------
export const publicRouter = Router();
publicRouter.get('/info', (req, res) => {
  const platform = db.prepare("SELECT value FROM settings WHERE key='platform'").get();
  const year = db.prepare('SELECT year FROM academic_years WHERE is_current=1').get();
  let p = {};
  try { p = JSON.parse(platform?.value || '{}'); } catch {}
  res.json({
    platform_name_ar: 'دوري محطات نواتج التعلّم – العلوم',
    platform_name_en: 'Science Learning Outcomes Championship',
    tagline: 'كل محطة اكتشاف، وكل تحدٍّ إتقان، وكل إنجاز يقود إلى التميّز',
    school_name: p.school_name || 'المدرسة السادسة عشر',
    school_name_en: p.school_name_en || 'School No. 16',
    teacher_name: p.teacher_name || 'موضي أحمد علي الزقلي',
    principal_name: p.principal_name || 'مزنه الصقور',
    academic_year: year?.year || '1448هـ',
    stations_count: db.prepare('SELECT COUNT(*) c FROM stations WHERE active=1').get().c,
  });
});

export default router;
