import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import ActivityRunner from '../components/ActivityRunner';
import ExperimentRunner from '../components/ExperimentRunner';

interface Station {
  id: number; slug: string; title_ar: string; title_en: string; description_ar: string;
  objectives_ar: string; outcomes_ar: string; strategy: string; color: string; icon: string;
  lessons: any[]; activities: any[]; experiments: any[]; assessments: any[];
  progress: any; outcomes: any[];
}

export default function StationDetail() {
  const { id } = useParams();
  const [s, setS] = useState<Station | null>(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<'lesson' | 'activity' | 'experiment' | 'quiz'>('lesson');

  useEffect(() => {
    api<Station>(`/stations/${id}`).then(setS).catch(e => setErr(e.message));
  }, [id]);

  if (err) return <div className="card text-red-600">{err}</div>;
  if (!s) return <div className="text-center py-20 text-turquoise text-xl">جاري التحميل...</div>;

  const outcomes = (s.outcomes_ar || '').split('\n').filter(Boolean);
  const masteredOutcomes = new Set((s.outcomes || []).filter(o => o.mastery >= 80).map(o => o.outcome));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card !p-0 overflow-hidden">
        <div className="p-6 text-white" style={{ background: `linear-gradient(135deg, ${s.color}, #102C46)` }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="text-5xl mb-2">{s.icon}</div>
              <h1 className="text-3xl font-extrabold">{s.title_ar}</h1>
              <p className="text-white/80">{s.title_en}</p>
              <p className="mt-2 text-white/90">{s.description_ar}</p>
            </div>
            <div className="text-left">
              <div className="badge-chip bg-white/20 text-white mb-2">الاستراتيجية: {s.strategy || '—'}</div>
              {s.progress && <div className="badge-chip bg-gold text-navy">{s.progress.status === 'mastered' ? '⭐ متقنة' : s.progress.best_score ? `أفضل نتيجة: ${s.progress.best_score}%` : s.progress.status}</div>}
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 p-6 bg-slate-50">
          <div>
            <h3 className="font-extrabold text-navy mb-1">🎯 الأهداف</h3>
            <p className="text-sm text-slate-600 whitespace-pre-line">{s.objectives_ar}</p>
          </div>
          <div>
            <h3 className="font-extrabold text-navy mb-1">📋 نواتج التعلم</h3>
            <ul className="text-sm space-y-1">
              {outcomes.map((o, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span>{masteredOutcomes.has(o) ? '✅' : '⬜'}</span> {o}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center gap-2">
            {s.assessments.map(a => (
              <Link key={a.id} to={`/assessments/${a.id}/take`} className="btn-primary !py-2 text-sm">📝 {a.title_ar} ({a.question_count} أسئلة)</Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {([
          ['lesson', '📖 الدرس'],
          ['activity', '🎯 النشاط'],
          ['experiment', '🔬 التجربة الافتراضية'],
          ['quiz', '❓ اختبر نفسك'],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition ${tab === k ? 'bg-navy text-white' : 'bg-white text-navy border border-slate-200 hover:border-turquoise'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'lesson' && (
        <div className="card">
          {s.lessons.length === 0 ? <p className="text-slate-400">لا يوجد درس بعد</p> : s.lessons.map(l => (
            <div key={l.id}>
              <h2 className="text-xl font-extrabold text-navy mb-3">{l.title_ar}</h2>
              <p className="text-slate-700 leading-8 text-justify">{l.content_ar}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'activity' && (
        <div className="space-y-4">
          {s.activities.length === 0 ? <div className="card text-slate-400">لا توجد أنشطة بعد</div> :
            s.activities.map(a => <ActivityRunner key={a.id} activity={a} stationSlug={s.slug} stationId={s.id} />)}
        </div>
      )}

      {tab === 'experiment' && (
        <div className="space-y-4">
          {s.experiments.length === 0 ? <div className="card text-slate-400">لا توجد تجارب بعد</div> :
            s.experiments.map(e => <ExperimentRunner key={e.id} experiment={e} />)}
        </div>
      )}

      {tab === 'quiz' && (
        <div className="card text-center">
          <div className="text-5xl mb-3">❓</div>
          <h3 className="font-extrabold text-navy text-lg mb-2">اختبار المحطة</h3>
          <p className="text-slate-600 mb-4">أجيبي عن أسئلة هذه المحطة واكسبي نقاطًا وافتحي شارات جديدة.</p>
          {s.assessments.length === 0 ? <p className="text-slate-400">لا يوجد اختبار لهذه المحطة بعد</p> :
            s.assessments.map(a => (
              <Link key={a.id} to={`/assessments/${a.id}/take`} className="btn-gold">ابدئي الاختبار ←</Link>
            ))}
        </div>
      )}
    </div>
  );
}
