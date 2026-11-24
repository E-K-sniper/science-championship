import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Competitions() {
  const { user } = useAuth();
  const [comps, setComps] = useState<any[]>([]);
  const [board, setBoard] = useState<Record<number, any[]>>({});
  const [msg, setMsg] = useState('');

  const load = () => api<any[]>('/competitions').then(setComps).catch(() => {});
  useEffect(() => { load(); }, []);

  const showBoard = async (id: number) => {
    const rows = await api<any[]>(`/competitions/${id}/leaderboard`).catch(() => []);
    setBoard(b => ({ ...b, [id]: rows }));
  };

  const join = async (c: any) => {
    try {
      const res = await api<{ assessment_id: number }>(`/competitions/${c.id}/join`, { method: 'POST' });
      window.location.href = `/assessments/${res.assessment_id}/take`;
    } catch (e: any) { setMsg(e.message); }
  };

  const statusLabel: Record<string, string> = { draft: 'مسودة', scheduled: 'قادمة', active: 'جارية', finished: 'انتهت', archived: 'مؤرشفة' };
  const statusColor: Record<string, string> = { scheduled: 'bg-blue-100 text-blue-700', active: 'bg-emerald-100 text-emerald-700', finished: 'bg-slate-200 text-slate-600', draft: 'bg-slate-200 text-slate-500', archived: 'bg-slate-200 text-slate-500' };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-navy">🏆 المسابقات</h1>
        <p className="text-slate-500 text-sm mt-1">تنافسي مع زميلاتكِ في مسابقات Sciences Championship</p>
        {msg && <div className="bg-red-50 text-red-700 rounded-xl p-3 mt-3 text-sm font-bold">{msg}</div>}
      </div>
      {comps.length === 0 && <div className="card text-center text-slate-400 py-10">لا توجد مسابقات حالياً</div>}
      {comps.map(c => (
        <div key={c.id} className="card">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-extrabold text-navy text-lg">{c.title_ar}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {c.question_count} سؤال • {c.time_limit_min} دقيقة • {c.participants} مشاركة
                {c.start_at && ` • تبدأ: ${c.start_at}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge-chip ${statusColor[c.status] || 'bg-slate-200'}`}>{statusLabel[c.status] || c.status}</span>
              {user?.role === 'student' && (c.status === 'active' || c.status === 'scheduled' || c.status === 'finished') && !c.my_participation && (
                <button onClick={() => join(c)} className="btn-primary !py-2">شاركِ ←</button>
              )}
              {c.my_participation && <span className="badge-chip bg-emerald-100 text-emerald-700">شاركتي ✓</span>}
              <button onClick={() => showBoard(c.id)} className="btn-outline !py-2 !px-3 text-sm">🏅 النتائج</button>
            </div>
          </div>
          {board[c.id] && (
            <div className="mt-4 bg-slate-50 rounded-xl p-4">
              <h3 className="font-extrabold text-navy text-sm mb-2">لوحة المتصدرات</h3>
              <div className="space-y-1">
                {board[c.id].map(r => (
                  <div key={r.rank} className="flex justify-between text-sm py-1 border-b border-slate-200 last:border-0">
                    <span>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `${r.rank}.`} {r.display_name} <span className="text-slate-400 text-xs">({r.class_name || ''})</span></span>
                    <span className="font-extrabold text-turquoise">{r.score}%</span>
                  </div>
                ))}
                {board[c.id].length === 0 && <p className="text-sm text-slate-400">لا توجد نتائج بعد</p>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
