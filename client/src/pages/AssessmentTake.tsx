import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface Q {
  id: number; text_ar: string; type: string; difficulty: number;
  options: { id: number; text_ar: string }[];
  selected_option_id: number | null;
}

export default function AssessmentTake() {
  const { id } = useParams();
  const nav = useNavigate();
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const start = await api<{ attempt_id: number; time_limit_min: number }>(`/assessments/${id}/start`, { method: 'POST' });
        setAttemptId(start.attempt_id);
        const data = await api<any>(`/assessments/attempts/${start.attempt_id}/questions`);
        setMeta(data.assessment);
        setQuestions(data.questions);
        const map: Record<number, number | null> = {};
        data.questions.forEach((q: Q) => { if (q.selected_option_id) map[q.id] = q.selected_option_id; });
        setAnswers(map);
        setTimeLeft(start.time_limit_min * 60);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [id]);

  // countdown
  useEffect(() => {
    if (timeLeft === null || attemptId === null) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return prev;
        if (prev <= 1) { clearInterval(t); submit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft === null, attemptId]);

  const submit = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    try {
      await api(`/assessments/attempts/${attemptId}/submit`, { method: 'POST' });
      nav(`/attempts/${attemptId}/result`);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  const select = async (qid: number, oid: number) => {
    setAnswers(a => ({ ...a, [qid]: oid }));
    if (attemptId) {
      try {
        await api(`/assessments/attempts/${attemptId}/answer`, {
          method: 'POST',
          body: JSON.stringify({ question_id: qid, option_id: oid }),
        });
      } catch {}
    }
  };

  if (error) return <div className="card text-red-600">{error} <button onClick={() => nav(-1)} className="underline">رجوع</button></div>;
  if (!questions.length) return <div className="text-center py-20 text-turquoise text-xl">جاري تجهيز الاختبار...</div>;

  const q = questions[idx];
  const mm = timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}` : '';
  const answeredCount = Object.values(answers).filter(Boolean).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-extrabold text-navy">{meta?.title_ar}</h1>
          <p className="text-sm text-slate-500">السؤال {idx + 1} من {questions.length} | أُجيب: {answeredCount}</p>
        </div>
        <div className={`text-2xl font-extrabold ${timeLeft !== null && timeLeft < 120 ? 'text-red-600 animate-pulse' : 'text-navy'}`}>⏱ {mm}</div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <span className="badge-chip bg-navy/10 text-navy">صعوبة {q.difficulty}/4</span>
        </div>
        <p className="text-lg font-bold text-navy mb-4 leading-8">{q.text_ar}</p>
        <div className="space-y-3">
          {q.options.map(o => (
            <button key={o.id} onClick={() => select(q.id, o.id)}
              className={`w-full text-right rounded-xl p-4 border-2 font-bold transition ${
                answers[q.id] === o.id ? 'bg-turquoise text-white border-turquoise' : 'bg-white border-slate-200 hover:border-turquoise'}`}>
              {o.text_ar}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <button className="btn-outline" disabled={idx === 0} onClick={() => setIdx(i => i - 1)}>→ السابق</button>
        {idx < questions.length - 1 ? (
          <button className="btn-navy" onClick={() => setIdx(i => i + 1)}>التالي ←</button>
        ) : (
          <button className="btn-gold" onClick={submit} disabled={submitting}>{submitting ? 'جاري التسليم...' : 'تسليم الاختبار 🏁'}</button>
        )}
      </div>
      <div className="flex gap-1 mt-4 flex-wrap justify-center">
        {questions.map((qq, i) => (
          <button key={qq.id} onClick={() => setIdx(i)}
            className={`w-8 h-8 rounded-lg text-xs font-bold ${i === idx ? 'bg-navy text-white' : answers[qq.id] ? 'bg-turquoise/30 text-navy' : 'bg-slate-200 text-slate-500'}`}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
