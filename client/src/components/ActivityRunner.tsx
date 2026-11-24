import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { MATCH_PAIRS, CLASSIFY_DATA, ORDER_DATA, SCENARIO_DATA, PREDICT_DATA } from '../lib/activityData';

interface Props { activity: any; stationSlug: string; stationId: number }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function CompletionBanner({ score, badges }: { score: number; badges: any[] }) {
  return (
    <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
      <div className="text-2xl font-extrabold text-emerald-700">🎉 أحسنتِ! أكملتِ النشاط</div>
      <div className="text-sm text-emerald-600 mt-1">النتيجة: {score}%{badges.length > 0 && ` — حصلتِ على: ${badges.map(b => b.icon + ' ' + b.title_ar).join('، ')}`}</div>
    </div>
  );
}

function MatchingGame({ slug, onDone }: { slug: string; onDone: (s: number) => void }) {
  const data = MATCH_PAIRS[slug];
  const [selL, setSelL] = useState<number | null>(null);
  const [selR, setSelR] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState(false);
  const [done, setDone] = useState(false);
  const left = useMemo(() => shuffle(data.left.map((_, i) => i)), [slug]);
  const right = useMemo(() => shuffle(data.right.map((_, i) => i)), [slug]);
  const pairOfL = useMemo(() => { const m = new Map<number, number>(); data.pairs.forEach(([l, r]) => m.set(l, r)); return m; }, [slug]);

  if (!data) return <p className="text-slate-400">لا تتوفر بيانات لهذا النشاط بعد</p>;

  const clickL = (i: number) => { if (matched.has(i)) return; setSelL(i); setWrong(false); };
  const clickR = (j: number) => {
    if (selL === null || matched.has(j)) return;
    if (pairOfL.get(selL) === j) {
      const nm = new Set(matched); nm.add(selL); nm.add(j); setMatched(nm);
      setSelL(null);
      if (nm.size === data.left.length + data.right.length) { setDone(true); onDone(100); }
    } else setWrong(true);
    setSelR(j);
  };

  const itemCls = (active: boolean, isMatched: boolean, isWrong: boolean) =>
    `p-3 rounded-xl border-2 text-center font-bold cursor-pointer transition ${
      isMatched ? 'bg-emerald-100 border-emerald-400 text-emerald-700' :
      active ? 'bg-turquoise/15 border-turquoise text-navy' :
      isWrong ? 'bg-red-100 border-red-400' : 'bg-white border-slate-200 hover:border-turquoise'}`;

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">اضغطي على عنصر من العمود الأيمن ثم طابقيه مع عنصر العمود الأيسر</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {left.map(i => <button key={i} onClick={() => clickL(i)} className={itemCls(selL === i, matched.has(i), false)}>{data.left[i]}</button>)}
        </div>
        <div className="space-y-2">
          {right.map(j => <button key={j} onClick={() => clickR(j)} className={itemCls(false, matched.has(j), wrong && selR === j)}>{data.right[j]}</button>)}
        </div>
      </div>
      {done && <CompletionBanner score={100} badges={[]} />}
    </div>
  );
}

function ClassifyGame({ slug, onDone }: { slug: string; onDone: (s: number) => void }) {
  const data = CLASSIFY_DATA[slug];
  const [items, setItems] = useState(() => shuffle(data?.items.map((it, i) => ({ ...it, id: i })) || []));
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, boolean>>({});

  if (!data) return <p className="text-slate-400">لا تتوفر بيانات لهذا النشاط بعد</p>;

  const pick = (itemId: number, cat: string) => {
    if (feedback[itemId] !== undefined) return;
    const item = items.find(i => i.id === itemId)!;
    const ok = item.cat === cat;
    setFeedback(f => ({ ...f, [itemId]: ok }));
    setAnswered(a => a + 1);
    if (ok) setScore(s => s + 1);
    if (answered + 1 === items.length) {
      setDone(true);
      const pct = Math.round(((score + (ok ? 1 : 0)) / items.length) * 100);
      onDone(pct);
    }
  };

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">اضغطي على كل عنصر ثم اختاري الفئة المناسبة له</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {data.categories.map(c => (
          <div key={c} className="bg-navy text-white rounded-xl p-3 text-center font-extrabold">{c}</div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(it => {
          const st = feedback[it.id];
          return (
            <div key={it.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 border-2 ${st === true ? 'bg-emerald-50 border-emerald-400' : st === false ? 'bg-red-50 border-red-400' : 'bg-white border-slate-200'}`}>
              <span className="font-bold text-sm">{it.label}</span>
              {st === undefined ? data.categories.map(c => (
                <button key={c} onClick={() => pick(it.id, c)} className="text-xs bg-turquoise/10 text-turquoise rounded-lg px-2 py-1 hover:bg-turquoise hover:text-white transition">{c}</button>
              )) : <span className="text-xs font-bold">{st ? '✅' : `❌ (${it.cat})`}</span>}
            </div>
          );
        })}
      </div>
      {done && <CompletionBanner score={Math.round((score / items.length) * 100)} badges={[]} />}
    </div>
  );
}

function OrderGame({ slug, onDone }: { slug: string; onDone: (s: number) => void }) {
  const data = ORDER_DATA[slug];
  const [pool, setPool] = useState(() => shuffle(data?.items.map((t, i) => ({ t, id: i })) || []));
  const [seq, setSeq] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);

  if (!data) return <p className="text-slate-400">لا تتوفر بيانات لهذا النشاط بعد</p>;

  const click = (id: number) => {
    if (done || wrong !== null) return;
    const expected = data.items[seq.length];
    if (pool.find(p => p.id === id)!.t === expected) {
      const ns = [...seq, id];
      setSeq(ns);
      if (ns.length === data.items.length) { setDone(true); onDone(100); }
    } else setWrong(id);
  };

  const reset = () => { setWrong(null); };

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">{data.instruction} — اضغطي على العناصر بالترتيب الصحيح</p>
      {wrong !== null && <div className="bg-red-50 text-red-700 rounded-xl p-2 mb-2 text-sm font-bold">ترتيب غير صحيح! <button onClick={reset} className="underline">حاولي مجددًا</button></div>}
      <div className="flex flex-wrap gap-2 mb-4">
        {pool.filter(p => !seq.includes(p.id)).map(p => (
          <button key={p.id} onClick={() => click(p.id)} className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-bold hover:border-turquoise">{p.t}</button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {seq.map((id, i) => <div key={id} className="bg-turquoise text-white rounded-xl px-4 py-2 font-bold">{i + 1}. {pool.find(p => p.id === id)!.t}</div>)}
      </div>
      {done && <CompletionBanner score={100} badges={[]} />}
    </div>
  );
}

const CELL_PARTS = [
  { id: 'wall', label: 'الجدار الخلوي', zone: 'الغلاف الخارجي', emoji: '🧱' },
  { id: 'membrane', label: 'الغشاء البلازمي', zone: 'الغلاف الداخلي', emoji: '⭕' },
  { id: 'nucleus', label: 'النواة', zone: 'المركز', emoji: '🔵' },
  { id: 'mito', label: 'الميتوكوندريا', zone: 'السيتوبلازم', emoji: '🔴' },
  { id: 'ribo', label: 'الريبوزومات', zone: 'السيتوبلازم', emoji: '⚪' },
  { id: 'vacuole', label: 'الفجوة العصارية', zone: 'السيتوبلازم', emoji: '💧' },
  { id: 'chloro', label: 'البلاستيدات الخضراء', zone: 'السيتوبلازم', emoji: '🌿' },
];
const CELL_ZONES = ['الغلاف الخارجي', 'الغلاف الداخلي', 'المركز', 'السيتوبلازم'];
const CORRECT_ZONE: Record<string, string> = { wall: 'الغلاف الخارجي', membrane: 'الغلاف الداخلي', nucleus: 'المركز', mito: 'السيتوبلازم', ribo: 'السيتوبلازم', vacuole: 'السيتوبلازم', chloro: 'السيتوبلازم' };

function CellBuilder({ onDone }: { onDone: (s: number) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const place = (zone: string) => {
    if (!sel || wrong) return;
    if (CORRECT_ZONE[sel] === zone) {
      const np = { ...placed, [sel]: zone };
      setPlaced(np); setSel(null); setWrong(null);
      if (Object.keys(np).length === CELL_PARTS.length) { setDone(true); onDone(100); }
    } else setWrong(sel);
  };

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">اضغطي على عضية ثم على المنطقة الصحيحة داخل الخلية النباتية</p>
      {wrong && <div className="bg-red-50 text-red-700 rounded-xl p-2 mb-2 text-sm font-bold">ليست هذه المنطقة! <button onClick={() => setWrong(null)} className="underline">حاولي مجددًا</button></div>}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          {CELL_PARTS.map(p => (
            <button key={p.id} onClick={() => !placed[p.id] && setSel(p.id)}
              className={`w-full flex items-center gap-2 rounded-xl p-3 border-2 font-bold text-sm transition ${placed[p.id] ? 'bg-emerald-50 border-emerald-400' : sel === p.id ? 'bg-turquoise/15 border-turquoise' : 'bg-white border-slate-200 hover:border-turquoise'}`}>
              <span className="text-xl">{p.emoji}</span> {p.label}
              {placed[p.id] && <span className="mr-auto text-emerald-600">✓</span>}
            </button>
          ))}
        </div>
        <div className="bg-gradient-to-br from-turquoise/10 to-purple/10 rounded-2xl border-2 border-dashed border-turquoise p-4">
          <div className="text-center font-extrabold text-navy mb-3">الخلية النباتية</div>
          <div className="grid grid-cols-2 gap-2">
            {CELL_ZONES.map(z => (
              <button key={z} onClick={() => place(z)} className="bg-white/80 rounded-xl p-3 text-xs font-bold border border-slate-200 hover:border-turquoise hover:bg-turquoise/10 min-h-[60px]">
                {z}
                <div className="mt-1 flex flex-wrap gap-1 justify-center">
                  {Object.entries(placed).filter(([, zz]) => zz === z).map(([pid]) => {
                    const part = CELL_PARTS.find(p => p.id === pid)!;
                    return <span key={pid} className="text-lg" title={part.label}>{part.emoji}</span>;
                  })}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      {done && <CompletionBanner score={100} badges={[]} />}
    </div>
  );
}

function QuizActivity({ stationId, activityId, onDone }: { stationId: number; activityId: number; onDone: (s: number) => void }) {
  const [qs, setQs] = useState<any[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api<{ questions: any[] }>(`/questions?station_id=${stationId}&limit=50`).then(r => {
      const approved = (r.questions || []).filter(q => q.options?.length >= 2);
      setQs(shuffle(approved).slice(0, 3));
    }).catch(() => setQs([]));
  }, [stationId]);

  if (qs === null) return <p className="text-slate-400">جاري تجهيز الأسئلة...</p>;
  if (qs.length === 0) return <p className="text-slate-400">لا توجد أسئلة متاحة لهذا النشاط بعد</p>;
  const q = qs[idx];
  const opts: any[] = shuffle<any>(q.options || []);

  const pick = (opt: any) => {
    if (picked !== null) return;
    setPicked(opt.id);
    const ok = !!opt.is_correct;
    if (ok) setScore(s => s + 1);
    setTimeout(() => {
      if (idx + 1 >= qs.length) {
        setDone(true);
        onDone(Math.round(((score + (ok ? 1 : 0)) / qs.length) * 100));
      } else { setIdx(i => i + 1); setPicked(null); }
    }, 900);
  };

  return (
    <div>
      <div className="text-sm text-slate-500 mb-2">سؤال {idx + 1} من {qs.length}</div>
      <p className="font-bold text-navy mb-3">{q.text_ar}</p>
      <div className="space-y-2">
        {opts.map((o: any) => (
          <button key={o.id} onClick={() => pick(o)} disabled={picked !== null}
            className={`w-full text-right rounded-xl p-3 border-2 font-bold transition ${
              picked === null ? 'bg-white border-slate-200 hover:border-turquoise' :
              o.is_correct ? 'bg-emerald-100 border-emerald-500' : picked === o.id ? 'bg-red-100 border-red-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
            {o.text_ar}
          </button>
        ))}
      </div>
      {done && <CompletionBanner score={Math.round((score / qs.length) * 100)} badges={[]} />}
    </div>
  );
}

export default function ActivityRunner({ activity, stationSlug, stationId }: Props) {
  const [completed, setCompleted] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const cfg = typeof activity.config === 'string' ? JSON.parse(activity.config || '{}') : (activity.config || {});

  const onDone = async (score: number) => {
    try {
      const res = await api('/assessments/activity-complete', {
        method: 'POST',
        body: JSON.stringify({ activity_type: 'activity', activity_id: activity.id, score }),
      });
      if (res.new_badges?.length) setBadges(res.new_badges);
    } catch {}
    setCompleted(true);
  };

  let body: React.ReactNode;
  if (completed) {
    body = <CompletionBanner score={0} badges={badges} />;
  } else if (activity.type === 'matching') {
    body = <MatchingGame slug={stationSlug} onDone={s => { onDone(s); }} />;
  } else if (activity.type === 'classification') {
    body = <ClassifyGame slug={stationSlug} onDone={s => { onDone(s); }} />;
  } else if (activity.type === 'ordering') {
    body = <OrderGame slug={stationSlug} onDone={s => { onDone(s); }} />;
  } else if (activity.type === 'drag_drop' && stationSlug === 'cell-secrets') {
    body = <CellBuilder onDone={s => { onDone(s); }} />;
  } else if (activity.type === 'scenario' || activity.type === 'predict') {
    const data = (activity.type === 'scenario' ? SCENARIO_DATA : PREDICT_DATA)[stationSlug] || [];
    body = data.length === 0 ? <p className="text-slate-400">لا تتوفر بيانات</p> : <ScenarioQuiz data={data} onDone={onDone} />;
  } else {
    body = <QuizActivity stationId={stationId} activityId={activity.id} onDone={s => { onDone(s); }} />;
  }

  return (
    <div className="card">
      <h3 className="font-extrabold text-navy mb-1">🎯 {activity.title_ar}</h3>
      <p className="text-sm text-slate-500 mb-4">{cfg.task || ''}</p>
      {body}
    </div>
  );
}

function ScenarioQuiz({ data, onDone }: { data: any[]; onDone: (s: number) => void }) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const q = data[idx];

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === q.answer;
    if (ok) setScore(s => s + 1);
    setTimeout(() => {
      if (idx + 1 >= data.length) { setDone(true); onDone(Math.round(((score + (ok ? 1 : 0)) / data.length) * 100)); }
      else { setIdx(x => x + 1); setPicked(null); }
    }, 1200);
  };

  return (
    <div>
      <div className="text-sm text-slate-500 mb-2">{idx + 1}/{data.length}</div>
      <p className="font-bold text-navy mb-3">{q.q}</p>
      <div className="space-y-2">
        {q.options.map((o: string, i: number) => (
          <button key={i} onClick={() => pick(i)} disabled={picked !== null}
            className={`w-full text-right rounded-xl p-3 border-2 font-bold ${
              picked === null ? 'bg-white border-slate-200 hover:border-turquoise' :
              i === q.answer ? 'bg-emerald-100 border-emerald-500' : picked === i ? 'bg-red-100 border-red-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
            {o}
          </button>
        ))}
      </div>
      {picked !== null && <p className="mt-3 text-sm bg-slate-50 rounded-xl p-3">💡 {q.explain}</p>}
      {done && <CompletionBanner score={Math.round((score / data.length) * 100)} badges={[]} />}
    </div>
  );
}
