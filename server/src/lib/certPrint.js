import db from '../db.js';

export function certificatePrintHtml(certId) {
  const c = db.prepare(`
    SELECT c.*, u.display_name FROM certificates c JOIN users u ON u.id=c.user_id WHERE c.id=?`).get(certId);
  if (!c) return null;
  const platform = db.prepare("SELECT value FROM settings WHERE key='platform'").get();
  let p = {};
  try { p = JSON.parse(platform?.value || '{}'); } catch {}
  const year = db.prepare('SELECT year FROM academic_years WHERE is_current=1').get()?.year || '1448هـ';
  const teacher = db.prepare("SELECT display_name FROM users WHERE role='teacher' LIMIT 1").get()?.display_name || 'موضي أحمد علي الزقلي';
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>شهادة</title>
  <style>body{font-family:'Segoe UI',Tahoma,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f6f8fc}
  .cert{width:800px;border:6px double #D6A343;border-radius:16px;padding:60px;text-align:center;background:#fff;color:#172B3A}
  h1{color:#102C46;font-size:34px;margin:0 0 10px}.sub{color:#168B9A;font-size:20px;margin-bottom:30px}
  .name{font-size:38px;font-weight:bold;color:#8059C5;margin:20px 0}.title{font-size:26px;color:#102C46;margin:16px 0}
  .meta{margin-top:40px;font-size:16px;line-height:2;color:#444}.num{color:#D6A343;font-weight:bold}
  @media print{body{background:#fff}.cert{border:6px double #D6A343}}</style></head><body>
  <div class="cert">
    <h1>${p.school_name || 'المدرسة السادسة عشر'}</h1>
    <div class="sub">دوري محطات نواتج التعلّم – العلوم | Science Learning Outcomes Championship</div>
    <div>تشهد المدرسة أنّ الطالبة</div>
    <div class="name">${c.display_name}</div>
    <div>قد ${c.title_ar}</div>
    <div class="meta">
      المعلمة: ${teacher}<br>
      مديرة المدرسة: ${p.principal_name || 'مزنه الصقور'}<br>
      العام الدراسي: ${year}<br>
      تاريخ الإصدار: ${new Date(c.issued_at.replace(' ', 'T') + 'Z').toLocaleDateString('ar-SA')}<br>
      رقم الشهادة: <span class="num">${c.cert_number}</span>
    </div>
  </div>
  <script>window.onload=()=>window.print()</script></body></html>`;
}
