import { useEffect, useState } from 'react';
import { api, openAuthed } from '../../lib/api';

export default function TeacherCertificates() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => { api('/admin/certificates').then(setItems).catch(() => {}); }, []);

  const filtered = filter ? items.filter(c => c.display_name?.includes(filter) || c.title_ar?.includes(filter)) : items;

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-navy">📜 الشهادات الصادرة</h1>
        <p className="text-slate-500 text-sm mt-1">{items.length} شهادة — تُطبع أو تُحفظ PDF من المتصفح</p>
        <input className="input mt-3 max-w-sm" placeholder="بحث بالاسم أو العنوان..." value={filter} onChange={e => setFilter(e.target.value)} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="card border-r-4 border-gold">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-extrabold text-navy">{c.title_ar}</div>
                <div className="text-sm text-slate-600 mt-1">👩‍🎓 {c.display_name}</div>
                <div className="text-xs text-slate-400 mt-1">{c.cert_number} • {new Date(c.issued_at).toLocaleDateString('ar-SA')}</div>
              </div>
              <button onClick={() => openAuthed(`/admin/certificates/${c.id}/print`)} className="btn-gold !py-2 !px-4 text-sm">🖨️ طباعة</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="card text-center text-slate-400 py-10 col-span-2">لا توجد شهادات بعد</div>}
      </div>
    </div>
  );
}
