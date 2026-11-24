import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const statusLabels: Record<string, string> = { draft: 'مسودة', scheduled: 'قادمة', active: 'جارية', finished: 'انتهت', archived: 'مؤرشفة' };

export default function TeacherCompetitions() {
  const [comps, setComps] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [board, setBoard] = useState<any[] | null>(null);
  const [boardFor, setBoardFor] = useState('');
  const [form, setForm] = useState({ title_ar: '', type: 'individual', question_count: 20, time_limit_min: 15, status: 'scheduled' });
  const [msg, setMsg] = useState('');

  const load = () => api<any[]>('/competitions').then(setComps).catch(() => {});
  useEffect(() => { load(); }, []);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const create = async () => {
    if (!form.title_ar) return;
    const res = await api('/competitions', { method: 'POST', body: JSON.stringify(form) });
    flash(`تم إنشاء المسابقة — ${res.questions} سؤال`);
    setShowForm(false); load();
  };

  const setStatus = async (c: any, status: string) => {
    await api(`/competitions/${c.id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('حذف المسابقة؟')) return;
    await api(`/competitions/${id}`, { method: 'DELETE' }); load();
  };

  const showBoardFn = async (c: any) => {
    const rows = await api<any[]>(`/competitions/${c.id}/leaderboard`).catch(() => []);
    setBoard(rows); setBoardFor(c.title_ar);
  };

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">🏆 إدارة المسابقات</h1>
          <p className="text-slate-500 text-sm">كل مسابقة تُنشأ باختبار أسئلة عشوائي من البنك المعتمد</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ مسابقة جديدة</button>
      </div>
      {msg && <div className="bg-emerald-50 text-emerald-700 rounded-xl p-3 font-bold">{msg}</div>}

      <div className="space-y-3">
        {comps.map(c => (
          <div key={c.id} className="card">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-extrabold text-navy">{c.title_ar}</div>
                <div className="text-xs text-slate-500">{c.question_count} سؤال • {c.time_limit_min} د • {c.participants} مشاركة • {statusLabels[c.status]}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <select className="input !w-auto !py-1.5 text-sm" value={c.status} onChange={e => setStatus(c, e.target.value)}>
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={() => showBoardFn(c)} className="btn-outline !py-1.5 !px-3 text-sm">النتائج</button>
                <button onClick={() => remove(c.id)} className="btn-outline !py-1.5 !px-3 text-sm text-red-600 border-red-300">حذف</button>
              </div>
            </div>
          </div>
        ))}
        {comps.length === 0 && <div className="card text-center text-slate-400 py-10">لا توجد مسابقات</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-extrabold text-navy mb-4">مسابقة جديدة</h3>
            <div className="space-y-3">
              <input className="input" placeholder="عنوان المسابقة" value={form.title_ar} onChange={e => setForm({ ...form, title_ar: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="individual">فردية</option>
                  <option value="team">فريقية</option>
                  <option value="class">صفية</option>
                </select>
                <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="scheduled">قادمة</option>
                  <option value="active">جارية</option>
                  <option value="draft">مسودة</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="number" placeholder="عدد الأسئلة" value={form.question_count} onChange={e => setForm({ ...form, question_count: parseInt(e.target.value) || 20 })} />
                <input className="input" type="number" placeholder="الدقائق" value={form.time_limit_min} onChange={e => setForm({ ...form, time_limit_min: parseInt(e.target.value) || 15 })} />
              </div>
              <div className="flex gap-2">
                <button onClick={create} className="btn-primary flex-1">إنشاء</button>
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {board && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setBoard(null)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-extrabold text-navy mb-3">نتائج: {boardFor}</h3>
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {board.map((r, i) => (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-slate-100">
                  <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {r.display_name}</span>
                  <span className="font-extrabold text-turquoise">{r.score}%</span>
                </div>
              ))}
              {board.length === 0 && <p className="text-sm text-slate-400 text-center py-4">لا توجد نتائج بعد</p>}
            </div>
            <button onClick={() => setBoard(null)} className="btn-outline w-full mt-4">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}
