import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api('/leaderboard').then(setRows).catch(() => {}); }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card mb-4">
        <h1 className="text-2xl font-extrabold text-navy">🥇 لوحة المتصدرات</h1>
        <p className="text-slate-500 text-sm mt-1">أعلى الطالبات نقاطًا — النقاط تُحسب من إتقان المحطات والألعاب والاختبارات</p>
      </div>
      <div className="card !p-0 overflow-hidden">
        {rows.map((r, i) => (
          <div key={r.rank} className={`flex items-center justify-between px-5 py-3 border-b last:border-0 ${user?.id === undefined ? '' : ''} ${r.display_name === user?.display_name ? 'bg-gold/10' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="w-10 text-center font-extrabold text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : r.rank}</span>
              <div>
                <div className="font-bold">{r.display_name} {r.display_name === user?.display_name && <span className="text-xs text-turquoise">(أنتِ)</span>}</div>
                <div className="text-xs text-slate-400">{r.class_name || ''}</div>
              </div>
            </div>
            <div className="font-extrabold text-turquoise text-lg">{r.points} نقطة</div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-center py-10 text-slate-400">لا توجد بيانات بعد</div>}
      </div>
    </div>
  );
}
