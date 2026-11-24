import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';

export default function TeacherAnalytics() {
  const [overview, setOverview] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [missed, setMissed] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    api('/admin/analytics/overview').then(setOverview).catch(() => {});
    api('/admin/analytics/students').then(setStudents).catch(() => {});
    api('/admin/analytics/stations').then(setStations).catch(() => {});
    api('/admin/analytics/missed-questions').then(setMissed).catch(() => {});
  }, []);

  const openStudent = async (id: number) => {
    const d = await api(`/admin/analytics/students/${id}`).catch(() => null);
    setDetail(d);
  };

  const masteryBands = [
    { label: 'تحت 60% — تحتاج دعماً', min: 0, max: 59, color: '#ef4444' },
    { label: '60–79% — نامية', min: 60, max: 79, color: '#f59e0b' },
    { label: '80–89% — متقنة', min: 80, max: 89, color: '#168B9A' },
    { label: '90%+ — تميز', min: 90, max: 100, color: '#8059C5' },
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-navy">📊 التحليلات والأداء</h1>
        <p className="text-slate-500 text-sm mt-1">بيانات حقيقية من قاعدة البيانات — لا أرقام تجريبية</p>
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            ['الطالبات', overview.students, '👩‍🎓'], ['محاولات الاختبارات', overview.attempts, '📝'],
            ['متوسط الدرجات', overview.avg_score + '%', '📈'], ['إجمالي النقاط', overview.total_points, '⭐'],
            ['أسئلة معتمدة', overview.questions_approved, '✅'], ['مسودات للمراجعة', overview.questions_draft, '📝'],
          ].map(([l, v, i]: any) => (
            <div key={l} className="card text-center"><div className="text-2xl mb-1">{i}</div><div className="text-xl font-extrabold text-navy">{v}</div><div className="text-xs text-slate-500">{l}</div></div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-extrabold text-navy mb-4">أداء المحطات (متوسط الدرجات)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stations}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title_ar" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avg_score" fill="#168B9A" name="متوسط الدرجات" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2 className="font-extrabold text-navy mb-4">إتقان المحطات (مكتملة / متقنة)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stations}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title_ar" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#D6A343" name="مكتملة" />
              <Bar dataKey="mastered" fill="#8059C5" name="متقنة" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="font-extrabold text-navy mb-4">أداء الطالبات</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr><th className="p-2 text-right">الاسم</th><th className="p-2">الصف</th><th className="p-2">النقاط</th><th className="p-2">المحطات</th><th className="p-2">متوسط الدرجات</th><th className="p-2">الأوسمة</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-2 font-bold">{s.display_name}</td>
                  <td className="p-2">{s.class_name || '—'}</td>
                  <td className="p-2 font-extrabold text-turquoise">{s.points}</td>
                  <td className="p-2">{s.stations_done}/16</td>
                  <td className="p-2">{s.avg_pct != null ? `${s.avg_pct}%` : '—'}</td>
                  <td className="p-2">{s.badges}</td>
                  <td className="p-2"><button onClick={() => openStudent(s.id)} className="btn-outline !py-1 !px-2 text-xs">تفاصيل</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="font-extrabold text-navy mb-4">⚠️ الأسئلة الأكثر خطأً (أعلى معدل أخطاء)</h2>
        <div className="space-y-2">
          {missed.slice(0, 10).map(m => (
            <div key={m.id} className="flex items-center justify-between bg-red-50 rounded-xl p-3">
              <div className="flex-1">
                <p className="font-bold text-sm">{m.text_ar}</p>
                <p className="text-xs text-slate-500">{m.station_title || 'عام'} • {m.wrong}/{m.attempts} خطأ</p>
              </div>
              <span className="badge-chip bg-red-200 text-red-800">{m.error_rate}%</span>
            </div>
          ))}
          {missed.length === 0 && <p className="text-sm text-slate-400">لا توجد بيانات كافية بعد</p>}
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setDetail(null)}>
          <div className="card w-full max-w-3xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-navy text-xl">{detail.student.display_name} — التحليل التفصيلي</h3>
              <button onClick={() => setDetail(null)} className="btn-outline !py-1 !px-3 text-sm">إغلاق</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div className="bg-slate-50 rounded-xl p-3"><div className="text-xl font-extrabold text-turquoise">{detail.points}</div><div className="text-xs">النقاط</div></div>
              <div className="bg-slate-50 rounded-xl p-3"><div className="text-xl font-extrabold text-purple">{detail.outcomes.filter((o: any) => o.mastery >= 80).length}</div><div className="text-xs">نواتج متقنة</div></div>
              <div className="bg-slate-50 rounded-xl p-3"><div className="text-xl font-extrabold text-gold">{detail.pre_post?.pre ? Math.round(detail.pre_post.pre) + '%' : '—'}</div><div className="text-xs">متوسط الاختبارات</div></div>
            </div>
            <h4 className="font-extrabold text-navy text-sm mb-2">مستوى الإتقان لكل ناتج تعلم</h4>
            <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
              {detail.outcomes.map((o: any, i: number) => {
                const band = masteryBands.find(b => o.mastery >= b.min && o.mastery <= b.max) || masteryBands[0];
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{o.station_title_ar} — {o.outcome}</span>
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${o.mastery}%`, background: band.color }} /></div>
                    <span className="text-xs font-bold w-10">{Math.round(o.mastery)}%</span>
                  </div>
                );
              })}
              {detail.outcomes.length === 0 && <p className="text-sm text-slate-400">لا توجد بيانات إتقان بعد</p>}
            </div>
            <h4 className="font-extrabold text-navy text-sm mb-2">سجل الاختبارات</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {detail.attempts.map((a: any) => (
                <div key={a.id} className="flex justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                  <span>{a.title_ar}</span>
                  <span className="font-extrabold text-turquoise">{a.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
