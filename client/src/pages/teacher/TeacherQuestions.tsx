import { useEffect, useState } from 'react';
import { api, apiUpload } from '../../lib/api';

export default function TeacherQuestions() {
  const [data, setData] = useState<{ questions: any[]; total: number }>({ questions: [], total: 0 });
  const [stations, setStations] = useState<any[]>([]);
  const [filter, setFilter] = useState({ station_id: '', status: '', q: '', page: 1 });
  const [editQ, setEditQ] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    const p = new URLSearchParams();
    if (filter.station_id) p.set('station_id', filter.station_id);
    if (filter.status) p.set('status', filter.status);
    if (filter.q) p.set('q', filter.q);
    p.set('page', String(filter.page));
    api(`/questions?${p}`).then(setData).catch(() => {});
  };
  useEffect(() => { api('/stations').then(setStations).catch(() => {}); }, []);
  useEffect(load, [filter.station_id, filter.status, filter.page]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const remove = async (id: number) => {
    if (!confirm('حذف السؤال نهائيًا؟')) return;
    await api(`/questions/${id}`, { method: 'DELETE' });
    load();
  };

  const setStatus = async (q: any, status: string) => {
    await api(`/questions/${q.id}`, { method: 'PUT', body: JSON.stringify({ ...q, review_status: status }) });
    load(); flash(`تم تحديث الحالة إلى ${status}`);
  };

  const importFile = async (f: File) => {
    try {
      const res = await apiUpload('/admin/questions/import', f);
      flash(`تم استيراد ${res.created} سؤال (مسودات للمراجعة)، تخطي ${res.skipped}`);
      load();
    } catch (e: any) { flash(e.message); }
  };

  const statusLabel: Record<string, string> = { draft: 'مسودة', approved: 'معتمد', rejected: 'مرفوض' };
  const statusColor: Record<string, string> = { draft: 'bg-gold/20 text-yellow-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">❓ بنك الأسئلة</h1>
          <p className="text-slate-500 text-sm">{data.total} سؤال — الأسئلة المسودة تحتاج مراجعتكِ قبل الاستخدام</p>
        </div>
        <div className="flex gap-2">
          <label className="btn-outline cursor-pointer">📥 استيراد ملف<input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && importFile(e.target.files[0])} /></label>
          <button onClick={() => { setShowForm(true); setEditQ(null); }} className="btn-primary">+ سؤال جديد</button>
        </div>
      </div>
      {msg && <div className="bg-emerald-50 text-emerald-700 rounded-xl p-3 font-bold">{msg}</div>}

      <div className="card flex flex-wrap gap-2">
        <select className="input !w-auto" value={filter.station_id} onChange={e => setFilter({ ...filter, station_id: e.target.value, page: 1 })}>
          <option value="">كل المحطات</option>
          {stations.map(s => <option key={s.id} value={s.id}>{s.title_ar}</option>)}
        </select>
        <select className="input !w-auto" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value, page: 1 })}>
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="approved">معتمد</option>
          <option value="rejected">مرفوض</option>
        </select>
        <input className="input !w-64" placeholder="بحث في نص السؤال..." value={filter.q} onChange={e => setFilter({ ...filter, q: e.target.value, page: 1 })} />
      </div>

      <div className="space-y-3">
        {data.questions.map(q => (
          <div key={q.id} className="card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`badge-chip ${statusColor[q.review_status]}`}>{statusLabel[q.review_status]}</span>
                  <span className="badge-chip bg-navy/10 text-navy">صعوبة {q.difficulty}</span>
                  <span className="text-xs text-slate-400">#{q.id} • {q.source}</span>
                </div>
                <p className="font-bold text-navy">{q.text_ar}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(q.options || []).map((o: any) => (
                    <span key={o.id} className={`text-xs rounded-lg px-2 py-1 ${o.is_correct ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-600'}`}>{o.text_ar}</span>
                  ))}
                </div>
                {q.explanation_ar && <p className="text-xs text-slate-500 mt-2">💡 {q.explanation_ar}</p>}
              </div>
              <div className="flex gap-1 flex-wrap">
                {q.review_status === 'draft' && <button onClick={() => setStatus(q, 'approved')} className="btn-outline !py-1 !px-2 text-xs text-emerald-700 border-emerald-300">اعتماد ✓</button>}
                {q.review_status === 'draft' && <button onClick={() => setStatus(q, 'rejected')} className="btn-outline !py-1 !px-2 text-xs text-red-600 border-red-300">رفض</button>}
                <button onClick={() => { setEditQ(q); setShowForm(true); }} className="btn-outline !py-1 !px-2 text-xs">تعديل</button>
                <button onClick={() => remove(q.id)} className="btn-outline !py-1 !px-2 text-xs text-red-600 border-red-300">حذف</button>
              </div>
            </div>
          </div>
        ))}
        {data.questions.length === 0 && <div className="card text-center text-slate-400 py-10">لا توجد أسئلة</div>}
      </div>

      <div className="flex justify-center gap-2">
        <button disabled={filter.page <= 1} onClick={() => setFilter({ ...filter, page: filter.page - 1 })} className="btn-outline !py-2">→ السابق</button>
        <span className="px-4 py-2 font-bold">صفحة {filter.page}</span>
        <button disabled={filter.page * 50 >= data.total} onClick={() => setFilter({ ...filter, page: filter.page + 1 })} className="btn-outline !py-2">التالي ←</button>
      </div>

      {showForm && <QuestionForm question={editQ} stations={stations} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); flash('تم الحفظ ✅'); }} />}
    </div>
  );
}

function QuestionForm({ question, stations, onClose, onSaved }: { question: any | null; stations: any[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    text_ar: question?.text_ar || '', explanation_ar: question?.explanation_ar || '',
    station_id: question?.station_id || '', difficulty: question?.difficulty || 2,
    outcome: question?.outcome || '', source: question?.source || 'teacher',
    review_status: question?.review_status || 'approved',
    options: question?.options?.length ? question.options.map((o: any) => ({ text_ar: o.text_ar, is_correct: !!o.is_correct })) : [{ text_ar: '', is_correct: false }, { text_ar: '', is_correct: false }, { text_ar: '', is_correct: false }, { text_ar: '', is_correct: false }],
  });

  const save = async () => {
    const body = { ...f, station_id: f.station_id ? parseInt(f.station_id) : null, options: f.options.filter((o: any) => o.text_ar.trim()) };
    if (question) await api(`/questions/${question.id}`, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/questions', { method: 'POST', body: JSON.stringify(body) });
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <h3 className="font-extrabold text-navy mb-4">{question ? 'تعديل سؤال' : 'سؤال جديد'}</h3>
        <div className="space-y-3">
          <textarea className="input" rows={2} placeholder="نص السؤال" value={f.text_ar} onChange={e => setF({ ...f, text_ar: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={f.station_id} onChange={e => setF({ ...f, station_id: e.target.value })}>
              <option value="">بدون محطة</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.title_ar}</option>)}
            </select>
            <select className="input" value={f.difficulty} onChange={e => setF({ ...f, difficulty: parseInt(e.target.value) })}>
              {[1, 2, 3, 4].map(d => <option key={d} value={d}>صعوبة {d}</option>)}
            </select>
          </div>
          <input className="input" placeholder="ناتج التعلم (اختياري)" value={f.outcome} onChange={e => setF({ ...f, outcome: e.target.value })} />
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600">الخيارات (حدد الصحيحة بـ ✓)</label>
            {f.options.map((o: any, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="checkbox" checked={o.is_correct} onChange={e => {
                  const opts = [...f.options]; opts[i] = { ...opts[i], is_correct: e.target.checked }; setF({ ...f, options: opts });
                }} className="w-5 h-5" />
                <input className="input flex-1" placeholder={`الخيار ${i + 1}`} value={o.text_ar} onChange={e => {
                  const opts = [...f.options]; opts[i] = { ...opts[i], text_ar: e.target.value }; setF({ ...f, options: opts });
                }} />
              </div>
            ))}
          </div>
          <textarea className="input" rows={2} placeholder="الشرح العلمي (يظهر بعد الإجابة)" value={f.explanation_ar} onChange={e => setF({ ...f, explanation_ar: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary flex-1">حفظ</button>
            <button onClick={onClose} className="btn-outline flex-1">إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}
