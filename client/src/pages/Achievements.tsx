import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const badgeColors = ['from-gold to-yellow-600', 'from-turquoise to-emerald-600', 'from-purple to-fuchsia-600', 'from-navy to-blue-800'];

export default function Achievements() {
  const [data, setData] = useState<{ earned: any[]; locked: any[] } | null>(null);
  useEffect(() => { api('/achievements').then(setData).catch(() => {}); }, []);

  if (!data) return <div className="text-center py-20 text-turquoise text-xl">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-navy">🏅 أوسمتي وإنجازاتي</h1>
        <p className="text-slate-500 text-sm mt-1">حصلي على الأوسمة بإنجاز المحطات والاختبارات والمسابقات</p>
      </div>
      <div className="card">
        <h2 className="font-extrabold text-navy mb-4">الأوسمة المحصلة ({data.earned.length})</h2>
        {data.earned.length === 0 ? <p className="text-slate-400 text-sm">لم تحصلي على أوسمة بعد — استكشفي المحطات والاختبارات!</p> : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {data.earned.map((b, i) => (
              <div key={b.id} className={`bg-gradient-to-br ${badgeColors[i % badgeColors.length]} rounded-2xl p-5 text-white text-center shadow-lg`}>
                <div className="text-5xl mb-2">{b.icon}</div>
                <div className="font-extrabold">{b.title_ar}</div>
                <div className="text-xs text-white/80 mt-1">{b.description_ar}</div>
                <div className="text-[10px] text-white/60 mt-2">{new Date(b.earned_at).toLocaleDateString('ar-SA')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <h2 className="font-extrabold text-navy mb-4">الأوسمة المتاحة ({data.locked.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {data.locked.map((b, i) => (
            <div key={b.id} className="bg-slate-100 rounded-2xl p-5 text-center opacity-60 grayscale">
              <div className="text-5xl mb-2">{b.icon}</div>
              <div className="font-extrabold text-slate-600">{b.title_ar}</div>
              <div className="text-xs text-slate-500 mt-1">{b.description_ar}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
