import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const typeLabels: Record<string, string> = { diagnostic: 'تشخيصي', station: 'محطة', daily: 'يومي', weekly: 'أسبوعي', mock: 'محاكاة نافس', remedial: 'علاجي', final: 'ختامي', competition: 'مسابقة' };

export default function TeacherAssessments() {
  const [items, setItems] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [viewQs, setViewQs] = useState<any[] | null>(null);
  const [form, setForm] = useState({ type: 'weekly', title_ar: '', station_id: '', question_count: 10, time_limit_min: 15, show_immediate_feedback: false });
  const [msg, setMsg] = useState('');

  const load = () => api<any[]>('/assessments').then(setItems).catch(() => {});
  useEffect(() => { load(); api('/stations').then(setStations).catch(() => {}); }, []);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const create = async () => {
    if (!form.title_ar) return;
    const res = await api('/assessments', { method: 'POST', body: JSON.stringify({ ...form, station_id: form.station_id ? parseInt(form.station_id) : null }) });
    flash(`تم إنشاء الاختبار — أُضيفت ${res.questions_added} أسئلة عشوائية`);
    setShowForm(false); load();
  };

  const remove = async (id: number) => {
    if (!confirm('حذف الاختبار؟')) return;
    await api(`/assessments/${id}`, { method: 'DELETE' });
    load();
  };

  const viewQuestions = async (id: number) => {
    const qs = await api<any[]>(`/assessments/${id}/questions`).catch(() => []);
    setViewQs(qs);
  };

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">📝 إدارة الاختبارات</h1>
          <p className="text-slate-500 text-sm">الأسئلة تُختار عشوائيًا من البنك المعتمد عند إنشاء الاختبار</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ اختبار جديد</button>
      </div>
      {msg && <div className="bg-emerald-50 text-emerald-700 rounded-xl p-3 font-bold">{msg}</div>}

      <div className="space-y-3">
        {items.map(a => (
          <div key={a.id} className="card flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-extrabold text-navy">{a.title_ar}</div>
              <div className="text-xs text-slate-500">{typeLabels[a.type] || a.type} • {a.question_count} سؤال • {a.time_limit_min} د • {a.station_title_ar || 'عام'}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => viewQuestions(a.id)} className="btn-outline !py-2 !px-3 text-sm">الأسئلة</button>
              <button onClick={() => remove(a.id)} className="btn-outline !py-2 !px-3 text-sm text-red-600 border-red-300">حذف</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="card text-center text-slate-400 py-10">لا توجد اختبارات — أنشئي أول اختبار</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-extrabold text-navy mb-4">اختبار جديد</h3>
            <div className="space-y-3">
              <input className="input" placeholder="عنوان الاختبار" value={form.title_ar} onChange={e => setForm({ ...form, title_ar: e.target.value })} />
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select className="input" value={form.station_id} onChange={e => setForm({ ...form, station_id: e.target.value })}>
                <option value="">أسئلة من كل المحطات</option>
                {stations.map(s => <option key={s.id} value={s.id}>محطة: {s.title_ar}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="number" placeholder="عدد الأسئلة" value={form.question_count} onChange={e => setForm({ ...form, question_count: parseInt(e.target.value) || 10 })} />
                <input className="input" type="number" placeholder="الدقائق" value={form.time_limit_min} onChange={e => setForm({ ...form, time_limit_min: parseInt(e.target.value) || 15 })} />
              </div>
              <label className="flex items-center gap-2 font-bold text-sm"><input type="checkbox" checked={form.show_immediate_feedback} onChange={e => setForm({ ...form, show_immediate_feedback: e.target.checked })} /> إظهار التغذية الراجعة الفورية</label>
              <div className="flex gap-2">
                <button onClick={create} className="btn-primary flex-1">إنشاء</button>
                <button onClick={() => setShowForm(false)} className="btn-outline flex-1">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewQs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setViewQs(null)}>
          <div className="card w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
            <h3 className="font-extrabold text-navy mb-4">أسئلة الاختبار ({viewQs.length})</h3>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {viewQs.map((q, i) => (
                <div key={q.id} className="bg-slate-50 rounded-xl p-3">
                  <p className="font-bold text-sm">{i + 1}. {q.text_ar}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(q.options || []).map((o: any) => <span key={o.id} className={`text-xs rounded px-2 py-0.5 ${o.is_correct ? 'bg-emerald-200 font-bold' : 'bg-white'}`}>{o.text_ar}</span>)}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setViewQs(null)} className="btn-outline w-full mt-4">إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}
