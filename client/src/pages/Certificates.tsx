import { useEffect, useState } from 'react';
import { api, openAuthed } from '../lib/api';

export default function Certificates() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api('/certificates').then(setItems).catch(() => {}); }, []);

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-navy">📜 شهاداتي</h1>
        <p className="text-slate-500 text-sm mt-1">الشهادات تُمنح تلقائيًا عند إتقان المحطات أو الفوز بالمسابقات</p>
      </div>
      {items.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-3">📜</div>
          <p className="text-slate-500">لا توجد شهادات بعد — ابدئي بإتقان محطات التعلم!</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(c => (
          <div key={c.id} className="card border-r-4 border-gold">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl mb-2">🏆</div>
                <div className="font-extrabold text-navy">{c.title_ar}</div>
                <div className="text-xs text-slate-500 mt-1">رقم الشهادة: {c.cert_number}</div>
                <div className="text-xs text-slate-500">تاريخ الإصدار: {new Date(c.issued_at).toLocaleDateString('ar-SA')}</div>
              </div>
              <button onClick={() => openAuthed(`/certificates/${c.id}/print`)} className="btn-gold !py-2 !px-4 text-sm">🖨️ طباعة / PDF</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
