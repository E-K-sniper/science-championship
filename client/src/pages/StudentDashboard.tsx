import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Dashboard {
  user: any; points: number; level: any; avg_mastery: number;
  stations: any[]; badges: any[]; all_badges: any[];
  recent_attempts: any[]; announcements: any[];
  upcoming_competitions: any[]; remedial: any[];
}

const statusStyle: Record<string, { bg: string; label: string }> = {
  locked: { bg: 'bg-slate-200 text-slate-500', label: 'مقفلة' },
  available: { bg: 'bg-turquoise/15 text-turquoise', label: 'متاحة' },
  in_progress: { bg: 'bg-purple/15 text-purple', label: 'قيد التنفيذ' },
  completed: { bg: 'bg-gold/20 text-yellow-700', label: 'مكتملة' },
  mastered: { bg: 'bg-emerald-100 text-emerald-700', label: 'متقنة' },
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [d, setD] = useState<Dashboard | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api<Dashboard>('/dashboard').then(setD).catch(e => setErr(e.message));
  }, []);

  if (err) return <div className="card text-red-600">{err}</div>;
  if (!d) return <div className="text-center py-20 text-turquoise text-xl">جاري تحميل لوحتكِ...</div>;

  const completed = d.stations.filter(s => ['completed', 'mastered'].includes(s.status)).length;
  const mastered = d.stations.filter(s => s.status === 'mastered').length;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="card bg-gradient-to-l from-navy to-[#1d4e6e] text-white !border-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">أهلاً بكِ يا {d.user.display_name} 👋</h1>
            <p className="text-white/70">{d.user.class_name ? `الصف: ${d.user.class_name}` : ''} | مستوى الإتقان: {d.avg_mastery}%</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center bg-white/10 rounded-xl px-5 py-3">
              <div className="text-2xl">{d.level.icon}</div>
              <div className="text-xs text-white/70">{d.level.name_ar}</div>
            </div>
            <div className="text-center bg-white/10 rounded-xl px-5 py-3">
              <div className="text-2xl font-extrabold text-gold">{d.points}</div>
              <div className="text-xs text-white/70">نقطة</div>
            </div>
          </div>
        </div>
        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>تقدم المحطات: {completed}/{d.stations.length}</span>
            <span>متقنة: {mastered}</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${(completed / d.stations.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Announcements */}
      {d.announcements.length > 0 && (
        <div className="card border-r-4 border-turquoise">
          <h2 className="font-extrabold text-navy mb-2">📢 الإعلانات</h2>
          {d.announcements.map(a => (
            <div key={a.id} className="py-2 border-b last:border-0 border-slate-100">
              <div className="font-bold text-sm">{a.title_ar}</div>
              {a.body_ar && <div className="text-sm text-slate-600">{a.body_ar}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Stations map */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-extrabold text-navy text-lg">🗺️ خريطة محطات التعلم</h2>
          <Link to="/assessments" className="text-turquoise font-bold text-sm hover:underline">كل الاختبارات ←</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {d.stations.map(s => {
            const st = statusStyle[s.status] || statusStyle.locked;
            return (
              <Link key={s.id} to={s.status === 'locked' ? '#' : `/stations/${s.id}`} onClick={e => s.status === 'locked' && e.preventDefault()}
                className={`rounded-xl p-3 text-center border-2 transition ${s.status === 'locked' ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' : 'bg-white hover:shadow-md border-slate-100'}`}
                style={s.status !== 'locked' ? { borderColor: s.color } : {}}>
                <div className="text-3xl mb-1">{s.icon}</div>
                <div className="text-xs font-bold leading-tight mb-1">{s.title_ar}</div>
                <span className={`badge-chip text-[10px] ${st.bg}`}>{st.label}</span>
                {s.best_score != null && <div className="text-[10px] text-slate-400 mt-1">{s.best_score}%</div>}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Badges */}
        <div className="card">
          <h2 className="font-extrabold text-navy mb-3">🏅 أوسمتي ({d.badges.length}/{d.all_badges.length})</h2>
          <div className="flex flex-wrap gap-2">
            {d.badges.map(b => (
              <div key={b.id} className="badge-chip bg-gold/15 text-yellow-700" title={b.description_ar}>
                {b.icon} {b.title_ar}
              </div>
            ))}
            {d.badges.length === 0 && <span className="text-sm text-slate-400">لم تحصلي على أوسمة بعد — استكشفي المحطات!</span>}
          </div>
          <Link to="/achievements" className="text-turquoise text-sm font-bold mt-3 inline-block hover:underline">عرض كل الأوسمة ←</Link>
        </div>

        {/* Remedial */}
        <div className="card">
          <h2 className="font-extrabold text-navy mb-3">📚 توصيات للتقوية</h2>
          {d.remedial.length === 0 ? (
            <p className="text-sm text-emerald-600 font-bold">ممتاز! لا توجد نقاط ضعف حالياً 🎉</p>
          ) : (
            <div className="space-y-2">
              {d.remedial.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-red-50 rounded-xl p-3">
                  <div>
                    <div className="font-bold text-sm">{r.title_ar}</div>
                    <div className="text-xs text-slate-600">{r.outcome} — الإتقان: {Math.round(r.mastery)}%</div>
                  </div>
                  <Link to={`/stations/${r.slug}`} className="btn-outline !px-3 !py-1.5 text-xs">راجعِ</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent attempts + competitions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-extrabold text-navy mb-3">📝 آخر الاختبارات</h2>
          {d.recent_attempts.length === 0 ? <p className="text-sm text-slate-400">لا توجد اختبارات بعد</p> : (
            <div className="space-y-2">
              {d.recent_attempts.map(a => (
                <Link key={a.id} to={`/attempts/${a.id}/result`} className="flex justify-between items-center bg-slate-50 rounded-xl p-3 hover:bg-slate-100">
                  <div className="font-bold text-sm">{a.title_ar}</div>
                  <div className="font-extrabold text-turquoise">{a.percentage}%</div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="font-extrabold text-navy mb-3">🏆 مسابقات قادمة</h2>
          {d.upcoming_competitions.length === 0 ? <p className="text-sm text-slate-400">لا توجد مسابقات حالياً</p> : (
            <div className="space-y-2">
              {d.upcoming_competitions.map(c => (
                <Link key={c.id} to="/competitions" className="flex justify-between items-center bg-slate-50 rounded-xl p-3 hover:bg-slate-100">
                  <div className="font-bold text-sm">{c.title_ar}</div>
                  <span className="badge-chip bg-purple/15 text-purple text-xs">{c.status === 'active' ? 'جارية' : 'قادمة'}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
