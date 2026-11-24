import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function TeacherDashboard() {
  const [d, setD] = useState<any>(null);
  const [ann, setAnn] = useState({ title_ar: '', body_ar: '', audience: 'students' });
  const [msg, setMsg] = useState('');

  useEffect(() => { api('/admin/dashboard-summary').then(setD).catch(() => {}); }, []);

  const postAnn = async () => {
    if (!ann.title_ar) return;
    await api('/announcements', { method: 'POST', body: JSON.stringify(ann) });
    setAnn({ title_ar: '', body_ar: '', audience: 'students' });
    setMsg('تم نشر الإعلان ✅');
    setTimeout(() => setMsg(''), 3000);
  };

  const cards = d ? [
    { label: 'الطالبات', value: d.students, icon: '👩‍🎓', color: 'bg-turquoise' },
    { label: 'الصفوف', value: d.classes, icon: '🏫', color: 'bg-purple' },
    { label: 'أسئلة معتمدة', value: d.questions, icon: '❓', color: 'bg-navy' },
    { label: 'أسئلة مسودة', value: d.draft_questions, icon: '📝', color: 'bg-gold' },
    { label: 'المسابقات', value: d.competitions, icon: '🏆', color: 'bg-emerald-600' },
    { label: 'الشهادات', value: d.certificates, icon: '📜', color: 'bg-red-500' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-l from-navy to-[#1d4e6e] text-white !border-0">
        <h1 className="text-2xl font-extrabold">👩‍🏫 لوحة تحكم المعلمة</h1>
        <p className="text-white/70 text-sm mt-1">إدارة المنصة، الطالبات، المحتوى، التحليلات</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => (
          <div key={c.label} className="card text-center">
            <div className={`w-12 h-12 ${c.color} text-white rounded-xl flex items-center justify-center text-2xl mx-auto mb-2`}>{c.icon}</div>
            <div className="text-2xl font-extrabold text-navy">{c.value}</div>
            <div className="text-xs text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-extrabold text-navy mb-3">📢 نشر إعلان</h2>
          <input className="input mb-2" placeholder="عنوان الإعلان" value={ann.title_ar} onChange={e => setAnn({ ...ann, title_ar: e.target.value })} />
          <textarea className="input mb-2" rows={2} placeholder="نص الإعلان" value={ann.body_ar} onChange={e => setAnn({ ...ann, body_ar: e.target.value })} />
          <select className="input mb-3" value={ann.audience} onChange={e => setAnn({ ...ann, audience: e.target.value })}>
            <option value="students">للطالبات</option>
            <option value="all">للجميع</option>
            <option value="teachers">للمعلمات</option>
          </select>
          <button onClick={postAnn} className="btn-primary w-full">نشر</button>
          {msg && <p className="text-emerald-600 text-sm mt-2 font-bold">{msg}</p>}
        </div>
        <div className="card">
          <h2 className="font-extrabold text-navy mb-3">⚡ إجراءات سريعة</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/teacher/students" className="btn-outline !py-3 text-sm">👩‍🎓 إدارة الطالبات</Link>
            <Link to="/teacher/questions" className="btn-outline !py-3 text-sm">❓ بنك الأسئلة</Link>
            <Link to="/teacher/assessments" className="btn-outline !py-3 text-sm">📝 الاختبارات</Link>
            <Link to="/teacher/competitions" className="btn-outline !py-3 text-sm">🏆 المسابقات</Link>
            <Link to="/teacher/analytics" className="btn-outline !py-3 text-sm">📊 التحليلات</Link>
            <Link to="/teacher/reports" className="btn-outline !py-3 text-sm">📄 التقارير</Link>
            <Link to="/teacher/certificates" className="btn-outline !py-3 text-sm">📜 الشهادات</Link>
            <Link to="/teacher/settings" className="btn-outline !py-3 text-sm">⚙️ الإعدادات</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
