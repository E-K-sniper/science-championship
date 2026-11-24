import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const icons: Record<string, string> = {
  'wheel-of-fortune': '🎡', 'who-am-i': '🕵️', 'mystery-box': '📦', 'catch-mistake': '🔍',
  'memory-game': '🧠', 'science-maze': '🌀', 'arrange-discover': '🧩', 'treasure-hunt': '💎',
  'millionaire': '💰', 'escape-room': '🔐', 'rocket-race': '🚀', 'build-picture': '🖼️',
  'true-false': '✅', 'drag-classify': '🗂️',
};

export default function Games() {
  const [games, setGames] = useState<any[]>([]);
  useEffect(() => { api<any[]>('/games').then(setGames).catch(() => {}); }, []);

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-navy">🎮 مدينة الألعاب العلمية</h1>
        <p className="text-slate-500 text-sm mt-1">14 لعبة تعليمية ممتعة — كل لعبة تكافئكِ بالنقاط</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {games.map(g => (
          <Link key={g.id} to={`/games/${g.slug}`}
            className="card hover:shadow-lg hover:border-turquoise transition group">
            <div className="text-5xl mb-3 group-hover:scale-110 transition">{icons[g.slug] || '🎮'}</div>
            <div className="font-extrabold text-navy">{g.title_ar}</div>
            <div className="text-xs text-slate-500 mt-1 line-clamp-2">{g.description_ar}</div>
            <div className="flex justify-between items-center mt-3">
              <span className="badge-chip bg-gold/15 text-yellow-700">+{g.points} نقطة</span>
              {g.completed && <span className="text-emerald-600 text-sm font-bold">✓ مكتملة</span>}
            </div>
          </Link>
        ))}
      </div>
      {games.length === 0 && <div className="card text-center text-slate-400 py-10">جاري تحميل الألعاب...</div>}
    </div>
  );
}
