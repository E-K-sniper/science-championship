import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

interface Result {
  attempt: { id: number; score: number; total: number; percentage: number };
  assessment: { title_ar: string; type: string };
  answers: { question_id: number; text_ar: string; explanation_ar: string; is_correct: boolean; options: any[]; selected_option_id: number | null }[];
}

export default function AssessmentResult() {
  const { id } = useParams();
  const [r, setR] = useState<Result | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api<Result>(`/assessments/attempts/${id}/result`).then(setR).catch(e => setErr(e.message));
  }, [id]);

  if (err) return <div className="card text-red-600">{err}</div>;
  if (!r) return <div className="text-center py-20 text-turquoise text-xl">جاري تحميل النتيجة...</div>;

  const pct = r.attempt.percentage;
  const color = pct >= 90 ? 'text-emerald-600' : pct >= 60 ? 'text-gold' : 'text-red-600';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card text-center">
        <div className="text-6xl mb-2">{pct >= 60 ? '🎉' : '💪'}</div>
        <h1 className="text-2xl font-extrabold text-navy">{r.assessment.title_ar}</h1>
        <div className={`text-5xl font-extrabold my-3 ${color}`}>{pct}%</div>
        <p className="text-slate-600">أجبتِ بشكل صحيح على {r.attempt.score} من {r.attempt.total} أسئلة</p>
        <div className="flex justify-center gap-3 mt-4">
          <Link to="/dashboard" className="btn-primary">لوحتي</Link>
          <Link to="/assessments" className="btn-outline">اختبارات أخرى</Link>
        </div>
      </div>

      <div className="card">
        <h2 className="font-extrabold text-navy mb-4">📋 مراجعة الإجابات</h2>
        <div className="space-y-4">
          {r.answers.map((a, i) => (
            <div key={a.question_id} className={`rounded-xl p-4 border-2 ${a.is_correct ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
              <div className="flex items-start gap-2">
                <span className="text-xl">{a.is_correct ? '✅' : '❌'}</span>
                <div className="flex-1">
                  <p className="font-bold text-navy">{i + 1}. {a.text_ar}</p>
                  {a.explanation_ar && <p className="text-sm text-slate-600 mt-1 bg-white/70 rounded-lg p-2">💡 {a.explanation_ar}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {a.options.map((o: any) => (
                      <span key={o.id} className={`text-xs rounded-lg px-2 py-1 font-bold ${
                        o.is_correct ? 'bg-emerald-200 text-emerald-800' : o.id === a.selected_option_id ? 'bg-red-200 text-red-800' : 'bg-slate-100 text-slate-500'}`}>
                        {o.text_ar}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
