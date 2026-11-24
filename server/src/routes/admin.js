import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import db from '../db.js';
import { authRequired, requireTeacher } from '../auth.js';
import { hashPassword } from '../auth.js';
import { certificatePrintHtml } from '../lib/certPrint.js';

const router = Router();
router.use(authRequired, requireTeacher);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ---------- Classes ----------
router.get('/classes', (req, res) => {
  res.json(db.prepare('SELECT * FROM classes ORDER BY id').all());
});

router.post('/classes', (req, res) => {
  const { name, grade, academic_year } = req.body || {};
  if (!name) return res.status(400).json({ error: 'اسم الصف مطلوب' });
  const info = db.prepare('INSERT INTO classes (name, grade, academic_year) VALUES (?,?,?)').run(name, grade || 'الصف السادس', academic_year || '');
  res.json({ id: info.lastInsertRowid });
});

router.put('/classes/:id', (req, res) => {
  const { name, grade, academic_year } = req.body || {};
  db.prepare('UPDATE classes SET name=?, grade=?, academic_year=? WHERE id=?').run(name, grade || '', academic_year || '', req.params.id);
  res.json({ ok: true });
});

// ---------- Students ----------
router.get('/students', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.email, u.display_name, u.active, u.created_at, u.class_id, c.name AS class_name,
      COALESCE((SELECT SUM(points) FROM points_transactions WHERE user_id=u.id),0) AS points
    FROM users u LEFT JOIN classes c ON c.id=u.class_id
    WHERE u.role='student' ORDER BY u.id DESC`).all();
  res.json(rows);
});

router.post('/students', (req, res) => {
  const { display_name, email, password, class_id } = req.body || {};
  if (!display_name || !email || !password) return res.status(400).json({ error: 'الاسم والبريد وكلمة المرور مطلوبة' });
  if (password.length < 6) return res.status(400).json({ error: 'كلمة المرور 6 أحرف على الأقل' });
  const exists = db.prepare('SELECT id FROM users WHERE email=?').get(String(email).trim().toLowerCase());
  if (exists) return res.status(400).json({ error: 'البريد مستخدم مسبقًا' });
  const info = db.prepare("INSERT INTO users (email, password_hash, display_name, role, class_id) VALUES (?, ?, ?, 'student', ?)")
    .run(String(email).trim().toLowerCase(), hashPassword(password), display_name, class_id || null);
  res.json({ id: info.lastInsertRowid });
});

router.put('/students/:id', (req, res) => {
  const { display_name, email, class_id, active } = req.body || {};
  db.prepare('UPDATE users SET display_name=?, email=?, class_id=?, active=? WHERE id=? AND role=\'student\'')
    .run(display_name, String(email || '').toLowerCase(), class_id || null, active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/students/:id', (req, res) => {
  db.prepare("DELETE FROM users WHERE id=? AND role='student'").run(req.params.id);
  res.json({ ok: true });
});

// Import students from CSV/XLSX: columns name,email,password,class_name(optional)
router.post('/students/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع ملف' });
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    let created = 0, skipped = 0;
    const ins = db.prepare("INSERT INTO users (email, password_hash, display_name, role, class_id) VALUES (?, ?, ?, 'student', ?)");
    const findClass = db.prepare('SELECT id FROM classes WHERE name=?');
    for (const r of rows) {
      const name = r['name'] || r['الاسم'] || r['display_name'] || '';
      const email = String(r['email'] || r['البريد'] || r['user_email'] || '').trim().toLowerCase();
      const pass = String(r['password'] || r['كلمة_المرور'] || r['password'] || '123456');
      const cls = r['class'] || r['الصف'] || r['class_name'] || '';
      if (!name || !email || !email.includes('@')) { skipped++; continue; }
      if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) { skipped++; continue; }
      const c = cls ? findClass.get(String(cls).trim()) : null;
      ins.run(email, hashPassword(pass), String(name).trim(), c?.id || null);
      created++;
    }
    res.json({ created, skipped });
  } catch (e) {
    res.status(400).json({ error: 'تعذر قراءة الملف: ' + e.message });
  }
});

// ---------- Question import (CSV/XLSX) ----------
// Expected columns: text, option1..option4, correct (1-4), explanation, station_slug, difficulty, source
router.post('/questions/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع ملف' });
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const stationBySlug = new Map(db.prepare('SELECT id, slug FROM stations').all().map(s => [s.slug, s.id]));
    const insQ = db.prepare(`INSERT INTO questions (station_id, domain, outcome, difficulty, type, text_ar, explanation_ar, source, review_status, created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?)`);
    const insO = db.prepare('INSERT INTO question_options (question_id, text_ar, is_correct, order_index) VALUES (?,?,?,?)');
    let created = 0, skipped = 0;
    for (const r of rows) {
      const text = r['text'] || r['question'] || r['السؤال'] || '';
      const opts = [r['option1'] || r['خيار1'], r['option2'] || r['خيار2'], r['option3'] || r['خيار3'], r['option4'] || r['خيار4']].filter(Boolean);
      const correct = parseInt(r['correct'] || r['الإجابة'] || '0', 10);
      if (!text || opts.length < 2) { skipped++; continue; }
      const slug = r['station_slug'] || r['station'] || '';
      const stationId = stationBySlug.get(String(slug).trim()) || null;
      const info = insQ.run(stationId, r['domain'] || null, r['outcome'] || null,
        Math.min(Math.max(parseInt(r['difficulty'] || '2', 10) || 2, 1), 4),
        'multiple_choice', String(text).trim(), String(r['explanation'] || r['شرح'] || ''),
        r['source'] || 'import', 'draft', req.user.id);
      opts.forEach((o, i) => insO.run(info.lastInsertRowid, String(o).trim(), i + 1 === correct ? 1 : 0, i));
      created++;
    }
    res.json({ created, skipped, note: 'الأسئلة المستوردة بحالة "مسودة" وتحتاج مراجعة المعلمة قبل استخدامها' });
  } catch (e) {
    res.status(400).json({ error: 'تعذر قراءة الملف: ' + e.message });
  }
});

// ---------- Analytics ----------
router.get('/analytics/overview', (req, res) => {
  const students = db.prepare("SELECT COUNT(*) c FROM users WHERE role='student' AND active=1").get().c;
  const attempts = db.prepare("SELECT COUNT(*) c FROM assessment_attempts WHERE status='submitted'").get().c;
  const avgScore = db.prepare("SELECT AVG(percentage) a FROM assessment_attempts WHERE status='submitted'").get().a || 0;
  const points = db.prepare("SELECT COALESCE(SUM(points),0) t FROM points_transactions").get().t;
  const questionsCount = db.prepare("SELECT COUNT(*) c FROM questions WHERE review_status='approved'").get().c;
  const drafts = db.prepare("SELECT COUNT(*) c FROM questions WHERE review_status='draft'").get().c;
  res.json({ students, attempts, avg_score: Math.round(avgScore * 10) / 10, total_points: points, questions_approved: questionsCount, questions_draft: drafts });
});

router.get('/analytics/students', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.display_name, u.email, c.name AS class_name,
      COALESCE((SELECT SUM(points) FROM points_transactions WHERE user_id=u.id),0) AS points,
      (SELECT COUNT(*) FROM station_progress sp WHERE sp.user_id=u.id AND sp.status IN ('completed','mastered')) AS stations_done,
      (SELECT AVG(percentage) FROM assessment_attempts t WHERE t.user_id=u.id AND t.status='submitted') AS avg_pct,
      (SELECT COUNT(*) FROM student_badges sb WHERE sb.user_id=u.id) AS badges
    FROM users u LEFT JOIN classes c ON c.id=u.class_id
    WHERE u.role='student' AND u.active=1 ORDER BY points DESC`).all();
  res.json(rows.map(r => ({ ...r, avg_pct: r.avg_pct ? Math.round(r.avg_pct * 10) / 10 : null })));
});

// Per-student detail: outcome mastery + attempt history
router.get('/analytics/students/:id', (req, res) => {
  const student = db.prepare("SELECT id, display_name, email, class_id FROM users WHERE id=? AND role='student'").get(req.params.id);
  if (!student) return res.status(404).json({ error: 'الطالبة غير موجودة' });
  const outcomes = db.prepare(`
    SELECT so.*, s.title_ar AS station_title_ar, s.slug FROM student_outcomes so
    JOIN stations s ON s.id=so.station_id WHERE so.user_id=? ORDER BY so.mastery ASC`).all(student.id);
  const attempts = db.prepare(`
    SELECT t.id, t.percentage, t.submitted_at, a.title_ar, a.type, s.title_ar AS station_title
    FROM assessment_attempts t JOIN assessments a ON a.id=t.assessment_id
    LEFT JOIN stations s ON s.id=a.station_id
    WHERE t.user_id=? AND t.status='submitted' ORDER BY t.id DESC LIMIT 50`).all(student.id);
  const prePost = db.prepare(`
    SELECT a.type,
      (SELECT AVG(t.percentage) FROM assessment_attempts t WHERE t.user_id=? AND t.assessment_id IN (SELECT id FROM assessments WHERE type='diagnostic') AND t.status='submitted') pre,
      (SELECT AVG(t.percentage) FROM assessment_attempts t WHERE t.user_id=? AND t.assessment_id IN (SELECT id FROM assessments WHERE type IN ('mock','final')) AND t.status='submitted') post
    FROM assessments a LIMIT 1`).get(student.id, student.id);
  const points = db.prepare('SELECT COALESCE(SUM(points),0) t FROM points_transactions WHERE user_id=?').get(student.id).t;
  res.json({ student, outcomes, attempts, points, pre_post: prePost });
});

// Station-level analytics
router.get('/analytics/stations', (req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.title_ar, s.slug, s.order_index,
      (SELECT COUNT(*) FROM station_progress sp WHERE sp.station_id=s.id AND sp.status IN ('completed','mastered')) completed,
      (SELECT COUNT(*) FROM station_progress sp WHERE sp.station_id=s.id AND sp.status='mastered') mastered,
      (SELECT AVG(best_score) FROM station_progress sp WHERE sp.station_id=s.id) avg_score
    FROM stations s WHERE s.active=1 ORDER BY s.order_index`).all();
  res.json(rows.map(r => ({ ...r, avg_score: r.avg_score ? Math.round(r.avg_score * 10) / 10 : null })));
});

// Frequently missed questions
router.get('/analytics/missed-questions', (req, res) => {
  const rows = db.prepare(`
    SELECT q.id, q.text_ar, q.station_id, s.title_ar AS station_title,
      COUNT(*) AS attempts,
      SUM(CASE WHEN sa.is_correct=0 THEN 1 ELSE 0 END) AS wrong,
      ROUND(100.0 * SUM(CASE WHEN sa.is_correct=0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS error_rate
    FROM student_answers sa JOIN questions q ON q.id=sa.question_id
    LEFT JOIN stations s ON s.id=q.station_id
    GROUP BY q.id HAVING attempts >= 3 ORDER BY error_rate DESC LIMIT 30`).all();
  res.json(rows);
});

// ---------- Reports export ----------
router.get('/reports/students.xlsx', (req, res) => {
  const rows = db.prepare(`
    SELECT u.display_name AS 'الاسم', u.email AS 'البريد', c.name AS 'الصف',
      COALESCE((SELECT SUM(points) FROM points_transactions WHERE user_id=u.id),0) AS 'النقاط',
      (SELECT COUNT(*) FROM station_progress sp WHERE sp.user_id=u.id AND sp.status IN ('completed','mastered')) AS 'المحطات المكتملة',
      (SELECT COUNT(*) FROM station_progress sp WHERE sp.user_id=u.id AND sp.status='mastered') AS 'المحطات المتقنة',
      (SELECT AVG(percentage) FROM assessment_attempts t WHERE t.user_id=u.id AND t.status='submitted') AS 'متوسط الدرجات'
    FROM users u LEFT JOIN classes c ON c.id=u.class_id
    WHERE u.role='student' ORDER BY 'النقاط' DESC`).all();
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الطالبات');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=students-report.xlsx');
  res.send(buf);
});

// ---------- Certificates (printable HTML → browser PDF) ----------
router.get('/certificates', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, u.display_name, u.email FROM certificates c JOIN users u ON u.id=c.user_id
    ORDER BY c.issued_at DESC LIMIT 200`).all();
  res.json(rows);
});

router.get('/certificates/:id/print', (req, res) => {
  const html = certificatePrintHtml(req.params.id);
  if (!html) return res.status(404).send('not found');
  res.type('html').send(html);
});

// ---------- Settings ----------
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) { try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; } }
  res.json(out);
});

router.put('/settings', (req, res) => {
  const body = req.body || {};
  const upsert = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const [k, v] of Object.entries(body)) upsert.run(k, JSON.stringify(v));
  res.json({ ok: true });
});

// ---------- Academic years ----------
router.get('/academic-years', (req, res) => {
  res.json(db.prepare('SELECT * FROM academic_years ORDER BY id DESC').all());
});

router.post('/academic-years', (req, res) => {
  const { year, is_current } = req.body || {};
  if (!year) return res.status(400).json({ error: 'السنة مطلوبة' });
  if (is_current) db.prepare('UPDATE academic_years SET is_current=0').run();
  const info = db.prepare('INSERT INTO academic_years (year, is_current) VALUES (?,?) ON CONFLICT(year) DO UPDATE SET is_current=excluded.is_current')
    .run(year, is_current ? 1 : 0);
  res.json({ id: info.lastInsertRowid });
});

// ---------- Public info (no auth needed data, still teacher-only here) ----------
router.get('/dashboard-summary', (req, res) => {
  res.json({
    students: db.prepare("SELECT COUNT(*) c FROM users WHERE role='student' AND active=1").get().c,
    classes: db.prepare('SELECT COUNT(*) c FROM classes').get().c,
    questions: db.prepare("SELECT COUNT(*) c FROM questions WHERE review_status='approved'").get().c,
    draft_questions: db.prepare("SELECT COUNT(*) c FROM questions WHERE review_status='draft'").get().c,
    competitions: db.prepare('SELECT COUNT(*) c FROM competitions').get().c,
    certificates: db.prepare('SELECT COUNT(*) c FROM certificates').get().c,
  });
});

export default router;
