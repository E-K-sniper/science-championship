import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}

export function checkPassword(pw, hash) {
  return bcrypt.compareSync(pw, hash);
}

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.display_name }, SECRET, { expiresIn: '7d' });
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const payload = jwt.verify(token, SECRET);
    const user = db.prepare('SELECT id, email, display_name, role, class_id, active FROM users WHERE id = ?').get(payload.id);
    if (!user || !user.active) return res.status(401).json({ error: 'الحساب غير نشط' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'جلسة منتهية، سجلي الدخول مرة أخرى' });
  }
}

export function requireTeacher(req, res, next) {
  if (req.user?.role !== 'teacher') return res.status(403).json({ error: 'صلاحيات المعلمة فقط' });
  next();
}

export function requireStudent(req, res, next) {
  if (req.user?.role !== 'student') return res.status(403).json({ error: 'صلاحيات الطالبات فقط' });
  next();
}

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) {
    try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
  }
  return out;
}

export function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value));
}

export const DEFAULT_POINTS = {
  correct_answer: 10,
  game_complete: 20,
  experiment_complete: 30,
  station_mastery: 50,
  assessment_complete: 100,
  mastery_improve: 150,
  all_stations_bonus: 500,
};
