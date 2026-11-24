import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ORDER_DATA, CLASSIFY_DATA } from '../lib/activityData';

interface Q { id: number; text_ar: string; explanation_ar?: string; options: { id: number; text_ar: string; is_correct?: boolean }[] }

function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function useRandomQuestions(n: number) {
  const [qs, setQs] = useState<Q[] | null>(null);
  useEffect(() => {
    api<{ questions: any[] }>('/questions?limit=100').then(r => {
      const valid = (r.questions || []).filter(q => (q.options || []).length >= 2);
      setQs(shuffle(valid).slice(0, n));
    }).catch(() => setQs([]));
  }, [n]);
  return qs;
}

function completeGame(gameId: number, score: number) {
  api('/assessments/activity-complete', { method: 'POST', body: JSON.stringify({ activity_type: 'game', activity_id: gameId, score }) }).catch(() => {});
}

function ResultScreen({ score, total, gameId, emoji }: { score: number; total: number; gameId: number; emoji: string }) {
  useEffect(() => { completeGame(gameId, Math.round((score / Math.max(total, 1)) * 100)); }, []);
  return (
    <div className="card text-center py-10">
      <div className="text-6xl mb-4">{emoji}</div>
      <h2 className="text-2xl font-extrabold text-navy mb-2">انتهت اللعبة!</h2>
      <div className="text-4xl font-extrabold text-gold my-3">{score}/{total}</div>
      <p className="text-slate-600 mb-6">أحسنتِ! أضفتِ نقاطًا إلى رصيدكِ</p>
      <div className="flex justify-center gap-3">
        <Link to="/games" className="btn-outline">ألعاب أخرى</Link>
        <Link to="/dashboard" className="btn-primary">لوحتي</Link>
      </div>
    </div>
  );
}

// ---------- Generic MCQ quiz engine ----------
function QuizRounds({ questions, gameId, emoji, title }: { questions: Q[]; gameId: number; emoji: string; title: string }) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = questions[idx];

  if (!questions.length) return <div className="card text-center py-10 text-slate-400">جاري تجهيز الأسئلة...</div>;
  if (idx >= questions.length) return <ResultScreen score={score} total={questions.length} gameId={gameId} emoji={emoji} />;

  const opts = useMemo(() => shuffle(q.options), [idx]);
  const pick = (o: any) => {
    if (picked !== null) return;
    setPicked(o.id);
    if (o.is_correct) setScore(s => s + 1);
    setTimeout(() => { setIdx(i => i + 1); setPicked(null); }, 800);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card mb-4 flex justify-between items-center">
        <span className="font-extrabold text-navy">{title}</span>
        <span className="badge-chip bg-navy/10 text-navy">{idx + 1}/{questions.length} | ⭐ {score}</span>
      </div>
      <div className="card">
        <p className="font-bold text-navy mb-4 text-lg">{q.text_ar}</p>
        <div className="space-y-2">
          {opts.map(o => (
            <button key={o.id} onClick={() => pick(o)} disabled={picked !== null}
              className={`w-full text-right rounded-xl p-3 border-2 font-bold ${
                picked === null ? 'bg-white border-slate-200 hover:border-turquoise' :
                o.is_correct ? 'bg-emerald-100 border-emerald-500' : picked === o.id ? 'bg-red-100 border-red-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
              {o.text_ar}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Wheel of Fortune ----------
function WheelGame({ gameId }: { gameId: number }) {
  const questions = useRandomQuestions(5);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [showQ, setShowQ] = useState(false);

  if (!questions) return <div className="card text-center py-10 text-slate-400">جاري التحميل...</div>;
  if (round >= questions.length) return <ResultScreen score={score} total={questions.length} gameId={gameId} emoji="🎡" />;

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setShowQ(false);
    setRotation(r => r + 1800 + Math.floor(Math.random() * 360));
    setTimeout(() => { setSpinning(false); setShowQ(true); }, 2200);
  };

  const q = questions[round];
  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="relative w-64 h-64 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border-8 border-navy overflow-hidden transition-transform duration-[2000ms] ease-out"
          style={{ transform: `rotate(${rotation}deg)`, background: 'conic-gradient(#D6A343,#168B9A,#8059C5,#102C46,#D6A343)' }}>
          {['🔬', '🧬', '⚗️', '🚀', '🌍', '⚡', '💡', '🧪'].map((e, i) => (
            <span key={i} className="absolute text-2xl" style={{ top: '8%', left: `${i * 12.5 + 4}%`, transform: `rotate(${i * 45}deg)` }}>{e}</span>
          ))}
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-3xl z-10">🔻</div>
      </div>
      {!showQ ? (
        <button onClick={spin} disabled={spinning} className="btn-gold text-xl px-10 py-4">
          {spinning ? 'تدور... 🎡' : 'أديري العجلة!'}
        </button>
      ) : (
        <div className="card text-right">
          <p className="font-bold text-navy mb-3">{q.text_ar}</p>
          <div className="space-y-2">
            {shuffle(q.options).map(o => (
              <button key={o.id} onClick={() => {
                if (o.is_correct) setScore(s => s + 1);
                setRound(r => r + 1); setShowQ(false);
              }} className="w-full text-right rounded-xl p-3 border-2 bg-white border-slate-200 font-bold hover:border-turquoise">
                {o.text_ar}
              </button>
            ))}
          </div>
          <button onClick={() => { setRound(r => r + 1); setShowQ(false); }} className="text-xs text-slate-400 mt-2 underline">تخطي ←</button>
        </div>
      )}
      <div className="mt-4 text-sm text-slate-500">الجولة {round + 1}/{questions.length} | النقاط: {score}</div>
    </div>
  );
}

// ---------- Memory Game ----------
const MEMO_CARDS = [
  ['🔬', 'ميكروسكوب', 'microscope'], ['🧬', 'DNA', 'dna'], ['⚗️', 'مختبر', 'lab'],
  ['🚀', 'صاروخ', 'rocket'], ['🌍', 'أرض', 'earth'], ['⚡', 'كهرباء', 'electricity'],
];
function MemoryGame({ gameId }: { gameId: number }) {
  const cards = useMemo(() => shuffle(MEMO_CARDS.flatMap(c => [
    { key: c[2] + 'a', emoji: c[0], label: c[1] }, { key: c[2] + 'b', emoji: c[0], label: c[1] },
  ])), []);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);

  const click = (i: number) => {
    if (flipped.length === 2 || flipped.includes(i) || matched.has(cards[i].key)) return;
    const nf = [...flipped, i]; setFlipped(nf);
    if (nf.length === 2) {
      setMoves(m => m + 1);
      if (cards[nf[0]].key.replace(/[ab]$/, '') === cards[nf[1]].key.replace(/[ab]$/, '')) {
        const nm = new Set(matched); nm.add(cards[nf[0]].key); nm.add(cards[nf[1]].key); setMatched(nm);
        setFlipped([]);
        if (nm.size === cards.length) { setDone(true); completeGame(gameId, Math.max(20, 60 - moves * 2)); }
      } else setTimeout(() => setFlipped([]), 800);
    }
  };

  if (done) return <ResultScreen score={Math.max(0, 12 - moves)} total={12} gameId={gameId} emoji="🧠" />;
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center text-sm text-slate-500 mb-3">المحاولات: {moves} | طابقي الصور المتشابهة</div>
      <div className="grid grid-cols-4 gap-3">
        {cards.map((c, i) => {
          const open = flipped.includes(i) || matched.has(c.key);
          return (
            <button key={i} onClick={() => click(i)}
              className={`aspect-square rounded-xl flex items-center justify-center text-3xl font-bold transition ${open ? 'bg-white border-2 border-turquoise' : 'bg-navy text-white'}`}>
              {open ? <span title={c.label}>{c.emoji}</span> : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- True/False ----------
function TrueFalseGame({ gameId }: { gameId: number }) {
  const questions = useRandomQuestions(8);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);

  if (!questions) return <div className="card text-center py-10 text-slate-400">جاري التحميل...</div>;
  if (idx >= questions.length) return <ResultScreen score={score} total={questions.length} gameId={gameId} emoji="✅" />;
  const q = questions[idx];
  const correctOpt = q.options.find(o => o.is_correct);
  // statement = correct answer text; randomly flip truth
  const isTrue = Math.random() < 0.5;
  const statement = isTrue ? correctOpt!.text_ar : shuffle(q.options.filter(o => !o.is_correct))[0].text_ar;

  const pick = (v: boolean) => {
    if (picked !== null) return;
    setPicked(v);
    if (v === isTrue) setScore(s => s + 1);
    setTimeout(() => { setIdx(i => i + 1); setPicked(null); }, 900);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card mb-4 flex justify-between"><span className="font-extrabold text-navy">صح أم خطأ؟</span><span className="badge-chip bg-navy/10">{idx + 1}/{questions.length} | ⭐ {score}</span></div>
      <div className="card text-center">
        <p className="text-xl font-bold text-navy mb-6 leading-8">"{statement}"</p>
        <div className="flex justify-center gap-4">
          <button onClick={() => pick(true)} disabled={picked !== null} className={`btn px-10 py-4 text-xl ${picked === true ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>✅ صح</button>
          <button onClick={() => pick(false)} disabled={picked !== null} className={`btn px-10 py-4 text-xl ${picked === false ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>❌ خطأ</button>
        </div>
        {picked !== null && <p className="mt-4 text-sm text-slate-600">الإجابة الصحيحة كانت: {isTrue ? 'صح' : 'خطأ'}</p>}
      </div>
    </div>
  );
}

// ---------- Rocket Race ----------
function RocketRace({ gameId }: { gameId: number }) {
  const questions = useRandomQuestions(6);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  if (!questions) return <div className="card text-center py-10 text-slate-400">جاري التحميل...</div>;
  if (idx >= questions.length) return <ResultScreen score={score} total={questions.length} gameId={gameId} emoji="🚀" />;
  const q = questions[idx];

  const pick = (o: any) => {
    if (picked !== null) return;
    setPicked(o.id);
    if (o.is_correct) setScore(s => s + 1);
    setTimeout(() => { setIdx(i => i + 1); setPicked(null); }, 700);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-extrabold text-navy">🚀 سباق الصواريخ — السؤال {idx + 1}/{questions.length}</span>
          <span className="text-3xl">{'🚀'.repeat(Math.min(idx + 1, 6))}</span>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-l from-turquoise to-purple transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
      </div>
      <div className="card">
        <p className="font-bold text-navy mb-4">{q.text_ar}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {shuffle(q.options).map(o => (
            <button key={o.id} onClick={() => pick(o)} disabled={picked !== null}
              className={`rounded-xl p-3 border-2 font-bold text-right ${
                picked === null ? 'bg-white border-slate-200 hover:border-turquoise' :
                o.is_correct ? 'bg-emerald-100 border-emerald-500' : picked === o.id ? 'bg-red-100 border-red-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
              {o.text_ar}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Millionaire ----------
const PRIZES = ['1000', '2000', '4000', '8000', '16000', '32000 🏆'];
function Millionaire({ gameId }: { gameId: number }) {
  const questions = useRandomQuestions(6);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [lifelines, setLifelines] = useState({ fifty: true, skip: true });

  if (!questions) return <div className="card text-center py-10 text-slate-400">جاري التحميل...</div>;
  if (idx >= questions.length) return <ResultScreen score={score} total={questions.length} gameId={gameId} emoji="💰" />;
  const q = questions[idx];
  let opts = shuffle(q.options);
  if (!lifelines.fifty && opts.length === 4) opts = opts.filter((o, i) => i < 2 || o.is_correct);

  const pick = (o: any) => {
    if (picked !== null) return;
    setPicked(o.id);
    if (o.is_correct) setScore(s => s + 1);
    setTimeout(() => { setIdx(i => i + 1); setPicked(null); }, 1200);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <div className="card mb-4 flex justify-between items-center">
            <span className="font-extrabold text-navy">💰 مليونير العلوم — المستوى {idx + 1}</span>
            <span className="badge-chip bg-gold/20 text-yellow-700">{PRIZES[Math.min(idx, PRIZES.length - 1)]}</span>
          </div>
          <div className="card">
            <p className="font-bold text-navy mb-4 text-lg">{q.text_ar}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {opts.map(o => (
                <button key={o.id} onClick={() => pick(o)} disabled={picked !== null}
                  className={`rounded-xl p-4 border-2 font-bold text-right flex items-center gap-3 ${
                    picked === null ? 'bg-white border-slate-200 hover:border-turquoise' :
                    o.is_correct ? 'bg-emerald-100 border-emerald-500' : picked === o.id ? 'bg-red-100 border-red-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                  <span className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center text-sm font-extrabold">{['أ', 'ب', 'ت', 'ث'][Math.min(opts.indexOf(o), 3)]}</span>
                  {o.text_ar}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {PRIZES.map((p, i) => (
            <div key={i} className={`rounded-xl p-2 text-center text-sm font-bold ${i === idx ? 'bg-gold text-navy' : i < idx ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{p}</div>
          ))}
          <div className="card !p-3 mt-4">
            <div className="text-xs font-bold text-slate-500 mb-2">مساعدات</div>
            <button disabled={!lifelines.fifty} onClick={() => setLifelines(l => ({ ...l, fifty: false }))} className="w-full btn-outline !py-1.5 text-xs mb-1">50:50</button>
            <button disabled={!lifelines.skip || idx >= questions.length - 1} onClick={() => { setIdx(i => i + 1); setPicked(null); setLifelines(l => ({ ...l, skip: false })); }} className="w-full btn-outline !py-1.5 text-xs">تخطي ⏭</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Treasure Hunt ----------
function TreasureHunt({ gameId }: { gameId: number }) {
  const questions = useRandomQuestions(5);
  const [grid, setGrid] = useState<(number | '💣' | null)[]>(Array(9).fill(null));
  const [active, setActive] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [found, setFound] = useState(0);
  const [done, setDone] = useState(false);
  const mines = useMemo(() => shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 3), []);

  if (!questions) return <div className="card text-center py-10 text-slate-400">جاري التحميل...</div>;

  const clickCell = (i: number) => {
    if (grid[i] !== null || active !== null) return;
    setActive(i);
  };

  const answer = (o: any) => {
    if (picked !== null || active === null) return;
    setPicked(o.id);
    const isMine = mines.includes(active);
    setTimeout(() => {
      const ng = [...grid];
      if (o.is_correct && !isMine) { ng[active] = found; setFound(f => f + 1); }
      else ng[active] = '💣';
      setGrid(ng);
      setActive(null); setPicked(null);
      if (found + 1 >= 3 || ng.filter(x => x === '💣').length >= 2) { setDone(true); completeGame(gameId, found * 20); }
    }, 700);
  };

  if (done) return <ResultScreen score={found} total={5} gameId={gameId} emoji="💎" />;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card mb-4 flex justify-between items-center">
        <span className="font-extrabold text-navy">💎 صيد الكنوز — الكنزات: {found}/3</span>
        <span className="text-sm text-red-500">💣 متبقية: {2 - grid.filter(x => x === '💣').length}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {grid.map((c, i) => (
          <button key={i} onClick={() => clickCell(i)} disabled={c !== null}
            className={`aspect-square rounded-xl text-3xl font-bold transition ${c === '💣' ? 'bg-red-100' : typeof c === 'number' ? 'bg-gold/30 border-2 border-gold' : 'bg-navy/80 hover:bg-navy text-white'}`}>
            {c === '💣' ? '💣' : typeof c === 'number' ? '💎' : '?'}
          </button>
        ))}
      </div>
      {active !== null && (
        <div className="card">
          <p className="text-xs text-slate-500 mb-2">سؤال لفتح الخلية — أجيبي صحيحًا لتكشفي الكنز!</p>
          <p className="font-bold text-navy mb-3">{questions[found % questions.length].text_ar}</p>
          <div className="space-y-2">
            {shuffle(questions[found % questions.length].options).map(o => (
              <button key={o.id} onClick={() => answer(o)} disabled={picked !== null}
                className={`w-full text-right rounded-xl p-3 border-2 font-bold ${picked === null ? 'bg-white border-slate-200' : o.is_correct ? 'bg-emerald-100 border-emerald-500' : picked === o.id ? 'bg-red-100 border-red-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                {o.text_ar}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Mystery Box ----------
function MysteryBox({ gameId }: { gameId: number }) {
  const questions = useRandomQuestions(6);
  const [opened, setOpened] = useState<Set<number>>(new Set());
  const [currentQ, setCurrentQ] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [rewards, setRewards] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);

  if (!questions) return <div className="card text-center py-10 text-slate-400">جاري التحميل...</div>;
  if (opened.size >= 6 && currentQ === null) {
    return <ResultScreen score={score} total={6} gameId={gameId} emoji="📦" />;
  }

  const open = (i: number) => {
    if (opened.has(i) || currentQ !== null) return;
    const no = shuffle([0, 1, 2, 3, 4, 5]).find(x => !opened.has(x));
    setCurrentQ(no!);
    setPicked(null);
  };

  const answer = (o: any) => {
    if (picked !== null || currentQ === null) return;
    setPicked(o.id);
    const q = questions[currentQ % questions.length];
    if (o.is_correct) {
      setScore(s => s + 10);
      setRewards(r => ({ ...r, [currentQ]: '✅ +10' }));
    } else {
      setRewards(r => ({ ...r, [currentQ]: '❌' }));
    }
    setTimeout(() => { setOpened(o2 => new Set([...o2, currentQ])); setCurrentQ(null); setPicked(null); }, 900);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card mb-4 flex justify-between items-center">
        <span className="font-extrabold text-navy">📦 الصندوق الغامض — النقاط: {score}</span>
        <span className="text-sm text-slate-500">افتحي {6 - opened.size} صناديق</span>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <button key={i} onClick={() => open(i)} disabled={opened.has(i) || currentQ !== null}
            className={`aspect-square rounded-2xl text-4xl flex items-center justify-center font-bold transition ${
              opened.has(i) ? (rewards[i]?.startsWith('✅') ? 'bg-emerald-100' : 'bg-red-100') : 'bg-gradient-to-br from-purple to-navy hover:scale-105'}`}>
            {opened.has(i) ? (rewards[i] || '📦') : '📦'}
          </button>
        ))}
      </div>
      {currentQ !== null && (
        <div className="card">
          <p className="text-xs text-slate-500 mb-2">سؤال مفاجئ! أجيبي بشكل صحيح تربحي 10 نقاط</p>
          <p className="font-bold text-navy mb-3">{questions[currentQ % questions.length].text_ar}</p>
          <div className="space-y-2">
            {shuffle(questions[currentQ % questions.length].options).map(o => (
              <button key={o.id} onClick={() => answer(o)} disabled={picked !== null}
                className={`w-full text-right rounded-xl p-3 border-2 font-bold ${picked === null ? 'bg-white border-slate-200' : o.is_correct ? 'bg-emerald-100 border-emerald-500' : picked === o.id ? 'bg-red-100 border-red-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                {o.text_ar}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Arrange & Discover ----------
function ArrangeGame({ gameId }: { gameId: number }) {
  const data = ORDER_DATA['web-of-life'];
  const [pool, setPool] = useState(() => shuffle(data.items.map((t, i) => ({ t, id: i }))));
  const [seq, setSeq] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [wrong, setWrong] = useState<number | null>(null);

  const click = (id: number) => {
    if (done || wrong !== null) return;
    if (pool.find(p => p.id === id)!.t === data.items[seq.length]) {
      const ns = [...seq, id]; setSeq(ns);
      if (ns.length === data.items.length) { setDone(true); completeGame(gameId, 100); }
    } else setWrong(id);
  };

  if (done) return <ResultScreen score={data.items.length} total={data.items.length} gameId={gameId} emoji="🧩" />;
  return (
    <div className="max-w-xl mx-auto">
      <div className="card mb-4"><span className="font-extrabold text-navy">🧩 رتّبي واكتشفي</span><p className="text-sm text-slate-500 mt-1">{data.instruction}</p></div>
      {wrong !== null && <div className="bg-red-50 text-red-700 rounded-xl p-2 mb-2 text-sm font-bold">غير صحيح! <button onClick={() => setWrong(null)} className="underline">حاولي مجددًا</button></div>}
      <div className="card">
        <div className="flex flex-wrap gap-2 mb-4">
          {pool.filter(p => !seq.includes(p.id)).map(p => <button key={p.id} onClick={() => click(p.id)} className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-bold hover:border-turquoise">{p.t}</button>)}
        </div>
        <div className="flex gap-2 flex-wrap min-h-[50px] border-t pt-3">
          {seq.map((id, i) => <div key={id} className="bg-turquoise text-white rounded-xl px-4 py-2 font-bold">{i + 1}. {pool.find(p => p.id === id)!.t}</div>)}
        </div>
      </div>
    </div>
  );
}

// ---------- Drag Classify ----------
function DragClassify({ gameId }: { gameId: number }) {
  const data = CLASSIFY_DATA['environment-explorers'];
  const [items, setItems] = useState(() => shuffle(data.items.map((it, i) => ({ ...it, id: i }))));
  const [done, setDone] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const pick = (id: number, cat: string) => {
    if (done.has(id)) return;
    const it = items.find(i => i.id === id)!;
    const ok = it.cat === cat;
    const nd = new Set(done); nd.add(id); setDone(nd);
    if (ok) setScore(s => s + 1);
    if (nd.size === items.length) { setFinished(true); completeGame(gameId, Math.round((score + (ok ? 1 : 0)) / items.length * 100)); }
  };

  if (finished) return <ResultScreen score={score} total={items.length} gameId={gameId} emoji="🗂️" />;
  return (
    <div className="max-w-3xl mx-auto">
      <div className="card mb-4"><span className="font-extrabold text-navy">🗂️ السحب والتصنيف</span><p className="text-sm text-slate-500 mt-1">صنّفي كل عنصر: حي أم غير حي؟</p></div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {data.categories.map(c => <div key={c} className="bg-navy text-white rounded-xl p-3 text-center font-extrabold">{c}</div>)}
      </div>
      <div className="card flex flex-wrap gap-2">
        {items.map(it => {
          const answered = done.has(it.id);
          const wasCorrect = answered && it.cat === (it as any)._picked;
          return (
            <div key={it.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 border-2 ${answered ? (wasCorrect ? 'bg-emerald-50 border-emerald-400' : 'bg-red-50 border-red-400') : 'bg-white border-slate-200'}`}>
              <span className="font-bold text-sm">{it.label}</span>
              {!answered && data.categories.map(c => <button key={c} onClick={() => { (it as any)._picked = c; pick(it.id, c); }} className="text-xs bg-turquoise/10 text-turquoise rounded-lg px-2 py-1 hover:bg-turquoise hover:text-white">{c}</button>)}
              {answered && <span className="text-xs font-bold">{wasCorrect ? '✅' : `❌ (${it.cat})`}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Build Picture ----------
const PICTURE_PARTS = ['🌍', '🚀', '⭐', '🪐', '☄️', '👩‍🚀'];
function BuildPicture({ gameId }: { gameId: number }) {
  const [placed, setPlaced] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const order = useMemo(() => shuffle(PICTURE_PARTS), []);

  const click = (p: string) => {
    const expected = order[placed.length];
    if (p !== expected) return;
    const np = [...placed, p]; setPlaced(np);
    if (np.length === order.length) { setDone(true); completeGame(gameId, 100); }
  };

  if (done) return <ResultScreen score={order.length} total={order.length} gameId={gameId} emoji="🖼️" />;
  return (
    <div className="max-w-xl mx-auto text-center">
      <div className="card mb-4"><span className="font-extrabold text-navy">🖼️ ابني الصورة العلمية</span><p className="text-sm text-slate-500 mt-1">اضغطي على القطع بالترتيب الصحيح لبناء مشهد الفضاء</p></div>
      <div className="card">
        <div className="text-6xl mb-4 tracking-widest">{placed.join('')}</div>
        <div className="flex flex-wrap justify-center gap-3">
          {order.filter(p => !placed.includes(p)).map((p, i) => (
            <button key={i} onClick={() => click(p)} className="w-16 h-16 rounded-xl bg-navy/10 hover:bg-navy/20 text-3xl flex items-center justify-center">{p}</button>
          ))}
        </div>
        <div className="mt-4 text-sm text-slate-400">الموضوع: رحلة فضائية إلى الكواكب</div>
      </div>
    </div>
  );
}

// ---------- Escape Room ----------
function EscapeRoom({ gameId }: { gameId: number }) {
  const questions = useRandomQuestions(3);
  const data = ORDER_DATA['space-explorers'];
  const [stage, setStage] = useState(0); // 0 order, 1 classify-ish MCQ, 2 final questions, 3 done
  const [orderSeq, setOrderSeq] = useState<number[]>([]);
  const [pool, setPool] = useState(() => shuffle(data.items.map((t, i) => ({ t, id: i }))));
  const [orderDone, setOrderDone] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  if (!questions) return <div className="card text-center py-10 text-slate-400">جاري التحميل...</div>;
  if (stage === 3) return <ResultScreen score={score} total={5} gameId={gameId} emoji="🔐" />;

  // Stage 0: ordering puzzle
  if (stage === 0) {
    const click = (id: number) => {
      if (orderDone) return;
      if (pool.find(p => p.id === id)!.t === data.items[orderSeq.length]) {
        const ns = [...orderSeq, id]; setOrderSeq(ns);
        if (ns.length === data.items.length) { setOrderDone(true); setTimeout(() => { setStage(1); setScore(s => s + 2); }, 800); }
      }
    };
    return (
      <div className="max-w-xl mx-auto">
        <div className="card mb-4"><span className="font-extrabold text-navy">🔐 غرفة الهروب — اللغز 1/3</span><p className="text-sm text-slate-500 mt-1">رتبي الكواكب بالترتيب الصحيح لفتح الباب الأول</p></div>
        <div className="card">
          <div className="flex flex-wrap gap-2 mb-4">{pool.filter(p => !orderSeq.includes(p.id)).map(p => <button key={p.id} onClick={() => click(p.id)} className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-bold hover:border-turquoise">{p.t}</button>)}</div>
          <div className="flex gap-2 flex-wrap">{orderSeq.map((id, i) => <div key={id} className="bg-turquoise text-white rounded-xl px-4 py-2 font-bold">{i + 1}. {pool.find(p => p.id === id)!.t}</div>)}</div>
        </div>
      </div>
    );
  }

  // Stage 1: MCQ questions
  if (stage === 1 || stage === 2) {
    if (qIdx >= questions.length) {
      setStage(3);
      return null;
    }
    const q = questions[qIdx];
    const pick = (o: any) => {
      if (picked !== null) return;
      setPicked(o.id);
      if (o.is_correct) setScore(s => s + 1);
      setTimeout(() => { setQIdx(i => i + 1); setPicked(null); if (qIdx + 1 >= questions.length) setStage(3); }, 900);
    };
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card mb-4"><span className="font-extrabold text-navy">🔐 غرفة الهروب — اللغز {stage === 1 ? 2 : 3}/3</span></div>
        <div className="card">
          <p className="font-bold text-navy mb-4">{q.text_ar}</p>
          <div className="space-y-2">
            {shuffle(q.options).map(o => (
              <button key={o.id} onClick={() => pick(o)} disabled={picked !== null}
                className={`w-full text-right rounded-xl p-3 border-2 font-bold ${picked === null ? 'bg-white border-slate-200 hover:border-turquoise' : o.is_correct ? 'bg-emerald-100 border-emerald-500' : picked === o.id ? 'bg-red-100 border-red-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                {o.text_ar}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ---------- Who Am I ----------
function WhoAmI({ gameId }: { gameId: number }) {
  const questions = useRandomQuestions(5);
  return <QuizRounds questions={questions || []} gameId={gameId} emoji="🕵️" title="🕵️ من أنا؟ — خمّني المفهوم" />;
}

// ---------- Catch the Mistake ----------
function CatchMistake({ gameId }: { gameId: number }) {
  const questions = useRandomQuestions(6);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);

  if (!questions) return <div className="card text-center py-10 text-slate-400">جاري التحميل...</div>;
  if (idx >= questions.length) return <ResultScreen score={score} total={questions.length} gameId={gameId} emoji="🔍" />;
  const q = questions[idx];
  const correctOpt = q.options.find(o => o.is_correct)!;
  const wrongOpt = shuffle(q.options.filter(o => !o.is_correct))[0];
  const isMistake = Math.random() < 0.5;
  const statement = isMistake ? wrongOpt.text_ar : correctOpt.text_ar;

  const pick = (isBad: boolean) => {
    if (picked !== null) return;
    setPicked(isBad);
    if (isBad === isMistake) setScore(s => s + 1);
    setTimeout(() => { setIdx(i => i + 1); setPicked(null); }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card mb-4 flex justify-between"><span className="font-extrabold text-navy">🔍 اصطادي الخطأ العلمي</span><span className="badge-chip bg-navy/10">{idx + 1}/{questions.length} | ⭐ {score}</span></div>
      <div className="card text-center">
        <p className="text-lg font-bold text-navy mb-6 leading-8">"{statement}"</p>
        <div className="flex justify-center gap-4">
          <button onClick={() => pick(true)} disabled={picked !== null} className={`btn px-8 py-3 ${picked === true ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'}`}>🚨 فيه خطأ</button>
          <button onClick={() => pick(false)} disabled={picked !== null} className={`btn px-8 py-3 ${picked === false ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>✅ صحيحة</button>
        </div>
        {picked !== null && <p className="mt-4 text-sm text-slate-600">الإجابة: {isMistake ? 'العبارة تحتوي خطأً' : 'العبارة صحيحة'} — {correctOpt.text_ar}</p>}
      </div>
    </div>
  );
}

// ---------- Maze ----------
function MazeGame({ gameId }: { gameId: number }) {
  const questions = useRandomQuestions(5);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  if (!questions) return <div className="card text-center py-10 text-slate-400">جاري التحميل...</div>;
  if (idx >= questions.length) return <ResultScreen score={score} total={questions.length} gameId={gameId} emoji="🌀" />;
  const q = questions[idx];
  const pick = (o: any) => {
    if (picked !== null) return;
    setPicked(o.id);
    if (o.is_correct) setScore(s => s + 1);
    setTimeout(() => { setIdx(i => i + 1); setPicked(null); }, 700);
  };
  return (
    <div className="max-w-2xl mx-auto">
      <div className="card mb-4">
        <div className="flex justify-between items-center">
          <span className="font-extrabold text-navy">🌀 متاهة العلوم — البوابة {idx + 1}/{questions.length}</span>
          <span className="text-2xl">{idx >= questions.length - 1 ? '🏁' : '🚪'}</span>
        </div>
        <div className="flex gap-1 mt-2">{questions.map((_, i) => <div key={i} className={`h-2 flex-1 rounded ${i < idx ? 'bg-emerald-400' : i === idx ? 'bg-turquoise' : 'bg-slate-200'}`} />)}</div>
      </div>
      <div className="card">
        <p className="font-bold text-navy mb-4">{q.text_ar}</p>
        <div className="grid grid-cols-2 gap-2">
          {shuffle(q.options).map(o => (
            <button key={o.id} onClick={() => pick(o)} disabled={picked !== null}
              className={`rounded-xl p-3 border-2 font-bold text-right ${picked === null ? 'bg-white border-slate-200 hover:border-turquoise' : o.is_correct ? 'bg-emerald-100 border-emerald-500' : picked === o.id ? 'bg-red-100 border-red-400' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
              {o.text_ar}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Main dispatcher ----------
export default function GamePlay() {
  const { slug } = useParams();
  const [game, setGame] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);

  useEffect(() => {
    api<any[]>('/games').then(list => {
      setGames(list);
      setGame(list.find(g => g.slug === slug) || null);
    }).catch(() => {});
  }, [slug]);

  if (!game) return <div className="card text-center py-10 text-slate-400">جاري التحميل...</div>;

  const gid = game.id;
  switch (slug) {
    case 'wheel-of-fortune': return <WheelGame gameId={gid} />;
    case 'memory-game': return <MemoryGame gameId={gid} />;
    case 'true-false': return <TrueFalseGame gameId={gid} />;
    case 'catch-mistake': return <CatchMistake gameId={gid} />;
    case 'rocket-race': return <RocketRace gameId={gid} />;
    case 'millionaire': return <Millionaire gameId={gid} />;
    case 'treasure-hunt': return <TreasureHunt gameId={gid} />;
    case 'mystery-box': return <MysteryBox gameId={gid} />;
    case 'arrange-discover': return <ArrangeGame gameId={gid} />;
    case 'drag-classify': return <DragClassify gameId={gid} />;
    case 'build-picture': return <BuildPicture gameId={gid} />;
    case 'escape-room': return <EscapeRoom gameId={gid} />;
    case 'science-maze': return <MazeGame gameId={gid} />;
    case 'who-am-i': return <WhoAmI gameId={gid} />;
    default: return <div className="card text-center py-10">اللعبة غير موجودة <Link to="/games" className="text-turquoise underline">عودة</Link></div>;
  }
}
