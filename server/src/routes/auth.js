import { Router } from 'express';
import db from '../db.js';
import { signToken, checkPassword, hashPassword, authRequired, requireTeacher } from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim().toLowerCase());
  if (!user || !user.active || !checkPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }
  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role, class_id: user.class_id },
  });
});

router.get('/me', authRequired, (req, res) => {
  const className = req.user.class_id
    ? db.prepare('SELECT name FROM classes WHERE id=?').get(req.user.class_id)?.name
    : null;
  res.json({ ...req.user, class_name: className });
});

router.post('/change-password', authRequired, (req, res) => {
  const { current, next } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!checkPassword(current || '', user.password_hash)) {
    return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }
  if (!next || next.length < 6) return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(next), user.id);
  res.json({ ok: true });
});

// Teacher resets a student password
router.post('/reset-password/:userId', authRequired, requireTeacher, (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  const target = db.prepare('SELECT role FROM users WHERE id=?').get(req.params.userId);
  if (!target) return res.status(404).json({ error: 'المستخدمة غير موجودة' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(password), req.params.userId);
  res.json({ ok: true });
});

export default router;
