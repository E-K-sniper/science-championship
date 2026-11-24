import { useState } from 'react';
import { api } from '../lib/api';
import { SIM_DATA } from '../lib/experimentData';

interface Props { experiment: any }

export default function ExperimentRunner({ experiment }: Props) {
  const cfg = typeof experiment.config === 'string' ? JSON.parse(experiment.config || '{}') : (experiment.config || {});
  const sim = SIM_DATA[cfg.kind];
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'sim' | 'quiz' | 'done'>('sim');
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [badges, setBadges] = useState<any[]>([]);
  const [completed, setCompleted] = useState(false);

  const finish = async (finalScore: number) => {
    setCompleted(true);
    try {
      const res = await api('/assessments/activity-complete', {
        method: 'POST',
        body: JSON.stringify({ activity_type: 'experiment', activity_id: experiment.id, score: finalScore }),
      });
      if (res.new_badges?.length) setBadges(res.new_badges);
    } catch {}
  };

  const nextStep = () => {
    if (!sim) return;
    if (step + 1 >= sim.steps.length) setPhase('quiz');
    else setStep(s => s + 1);
  };

  const pickAnswer = (i: number) => {
    if (!sim || picked !== null) return;
    setPicked(i);
    const ok = i === sim.questions[qIdx].answer;
    if (ok) setScore(s => s + 1);
    setTimeout(() => {
      if (qIdx + 1 >= sim.questions.length) {
        setPhase('done');
        finish(Math.round(((score + (ok ? 1 : 0)) / sim.questions.length) * 100));
      } else { setQIdx(x => x + 1); setPicked(null); }
    }, 1000);
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
        <div>
          <h3 className="font-extrabold text-navy text-lg">🔬 {experiment.title_ar}</h3>
          <p className="text-sm text-turquoise font-bold">الهدف: {experiment.objective_ar}</p>
        </div>
        <span className="badge-chip bg-purple/15 text-purple">+{experiment.points} نقطة</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="font-extrabold text-navy text-sm mb-2">🧰 الأدوات/المواد</div>
          <p className="text-sm text-slate-600">{experiment.materials_ar}</p>
          <div className="font-extrabold text-navy text-sm mt-3 mb-2">📝 التعليمات</div>
          <p className="text-sm text-slate-600">{experiment.instructions_ar}</p>
        </div>
        <div className="bg-navy/5 rounded-xl p-4">
          <div className="font-extrabold text-navy text-sm mb-2">💡 التفسير العلمي</div>
          <p className="text-sm text-slate-600">{experiment.explanation_ar}</p>
        </div>
      </div>

      {/* Simulation */}
      {phase === 'sim' && sim && (
        <div className="bg-gradient-to-br from-turquoise/10 to-purple/10 rounded-2xl p-6 text-center border-2 border-dashed border-turquoise">
          <div className="text-6xl mb-3">{sim.steps[step].emoji}</div>
          <div className="font-extrabold text-navy">{sim.steps[step].title} — {step + 1}/{sim.steps.length}</div>
          <p className="text-slate-600 mt-2">{sim.steps[step].desc}</p>
          <button onClick={nextStep} className="btn-primary mt-4">{step + 1 === sim.steps.length ? 'الانتقال للأسئلة ←' : 'التالي ←'}</button>
        </div>
      )}

      {/* Observation questions */}
      {phase === 'quiz' && sim && (
        <div>
          <div className="font-extrabold text-navy mb-3">❓ أسئلة الملاحظة ({qIdx + 1}/{sim.questions.length})</div>
          <p className="font-bold mb-3">{sim.questions[qIdx].q}</p>
          <div className="space-y-2">
            {sim.questions[qIdx].options.map((o, i) => (
              <button key={i} onClick={() => pickAnswer(i)} disabled={picked !== null}
                className={`w-full text-right rounded-xl p-3 border-2 font-bold transition ${
                  picked === null ? 'bg-white border-slate-200 hover:border-turquoise' :
                  i === sim.questions[qIdx].answer ? 'bg-emerald-100 border-emerald-500' : picked === i ? 'bg-red-100 border-red-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                {o}
              </button>
            ))}
          </div>
          {picked !== null && <p className="mt-3 text-sm bg-slate-50 rounded-xl p-3">💡 {sim.questions[qIdx].explain}</p>}
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
          <div className="text-3xl mb-2">🎉</div>
          <div className="font-extrabold text-emerald-700">أكملتِ التجربة بنجاح!</div>
          <div className="text-sm text-emerald-600 mt-1">نتيجة الملاحظة: {Math.round((score / (sim?.questions.length || 1)) * 100)}%</div>
          {badges.length > 0 && <div className="mt-2 text-gold font-bold">🏅 {badges.map(b => `${b.icon} ${b.title_ar}`).join('، ')}</div>}
        </div>
      )}

      {!sim && phase === 'sim' && (
        <div className="text-center">
          <p className="text-slate-500 mb-3">محاكاة تفاعلية لهذا النوع قيد الإضافة. يمكنكِ إنهاء التجربة مباشرة.</p>
          <button onClick={() => { setPhase('done'); finish(100); }} className="btn-primary">إنهاء التجربة</button>
        </div>
      )}
    </div>
  );
}
