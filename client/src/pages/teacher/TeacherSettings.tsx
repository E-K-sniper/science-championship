import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function TeacherSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>({});
  const [platform, setPlatform] = useState({ school_name: '', school_name_en: '', teacher_name: '', principal_name: '' });
  const [points, setPoints] = useState<Record<string, number>>({});
  const [year, setYear] = useState('');
  const [years, setYears] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [pw, setPw] = useState({ current: '', next: '' });

  useEffect(() => {
    api('/admin/settings').then(s => {
      setSettings(s);
      setPlatform({ ...platform, ...(s.platform || {}) });
      setPoints(s.points || {});
    }).catch(() => {});
    api('/admin/academic-years').then(setYears).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const savePlatform = async () => {
    await api('/admin/settings', { method: 'PUT', body: JSON.stringify({ platform }) });
    flash('تم حفظ بيانات المنصة ✅');
  };

  const savePoints = async () => {
    await api('/admin/settings', { method: 'PUT', body: JSON.stringify({ points }) });
    flash('تم حفظ إعدادات النقاط ✅');
  };

  const addYear = async () => {
    if (!year) return;
    await api('/admin/academic-years', { method: 'POST', body: JSON.stringify({ year, is_current: true }) });
    setYear(''); api('/admin/academic-years').then(setYears);
    flash('تم تعيين العام الدراسي ✅');
  };

  const changePw = async () => {
    try {
      await api('/auth/change-password', { method: 'POST', body: JSON.stringify(pw) });
      setPw({ current: '', next: '' }); flash('تم تغيير كلمة المرور ✅');
    } catch (e: any) { flash(e.message); }
  };

  const pointFields = [
    ['correct_answer', 'إجابة صحيحة'], ['game_complete', 'إكمال لعبة'], ['experiment_complete', 'إكمال تجربة'],
    ['station_mastery', 'إتقان محطة'], ['assessment_complete', 'إكمال اختبار'], ['mastery_improve', 'تحسن الإتقان'],
    ['all_stations_bonus', 'مكافأة كل المحطات'], ['competition_complete', 'إكمال مسابقة'],
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-navy">⚙️ إعدادات المنصة</h1>
        {msg && <p className="text-emerald-600 text-sm font-bold mt-2">{msg}</p>}
      </div>

      <div className="card">
        <h2 className="font-extrabold text-navy mb-4">بيانات المدرسة والمنصة</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="اسم المدرسة" value={platform.school_name} onChange={e => setPlatform({ ...platform, school_name: e.target.value })} />
          <input className="input" placeholder="School Name (EN)" dir="ltr" value={platform.school_name_en} onChange={e => setPlatform({ ...platform, school_name_en: e.target.value })} />
          <input className="input" placeholder="اسم المعلمة" value={platform.teacher_name} onChange={e => setPlatform({ ...platform, teacher_name: e.target.value })} />
          <input className="input" placeholder="مديرة المدرسة" value={platform.principal_name} onChange={e => setPlatform({ ...platform, principal_name: e.target.value })} />
        </div>
        <button onClick={savePlatform} className="btn-primary mt-4">حفظ</button>
      </div>

      <div className="card">
        <h2 className="font-extrabold text-navy mb-4">نظام النقاط (قابل للتعديل)</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {pointFields.map(([k, label]) => (
            <div key={k} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
              <span className="font-bold text-sm">{label}</span>
              <input type="number" className="input !w-24 !py-1.5 text-center" value={points[k] ?? ''} onChange={e => setPoints({ ...points, [k]: parseInt(e.target.value) || 0 })} />
            </div>
          ))}
        </div>
        <button onClick={savePoints} className="btn-primary mt-4">حفظ النقاط</button>
      </div>

      <div className="card">
        <h2 className="font-extrabold text-navy mb-4">العام الدراسي</h2>
        <div className="flex gap-2 mb-3">
          <input className="input max-w-xs" placeholder="مثال: 1449هـ" value={year} onChange={e => setYear(e.target.value)} />
          <button onClick={addYear} className="btn-primary">تعيين كحالي</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {years.map(y => <span key={y.id} className={`badge-chip ${y.is_current ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{y.year} {y.is_current ? '(حالي)' : ''}</span>)}
        </div>
      </div>

      <div className="card">
        <h2 className="font-extrabold text-navy mb-4">تغيير كلمة المرور ({user?.display_name})</h2>
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <input className="input" type="password" placeholder="الحالية" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} />
          <input className="input" type="password" placeholder="الجديدة" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} />
          <button onClick={changePw} className="btn-primary">تغيير</button>
        </div>
      </div>
    </div>
  );
}
