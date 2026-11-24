import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface Info {
  platform_name_ar: string; tagline: string; school_name: string; school_name_en: string;
  teacher_name: string; principal_name: string; academic_year: string; stations_count: number;
}

const cards = [
  { icon: '🧪', title: 'التقييم التشخيصي', desc: 'اكتشفي مستواكِ الحالي في العلوم', to: '/assessments?type=diagnostic' },
  { icon: '🗺️', title: 'محطات التعلم', desc: '16 محطة علمية تفاعلية', to: '/dashboard' },
  { icon: '🔬', title: 'المختبر الافتراضي', desc: 'تجارب علمية تفاعلية', to: '/lab' },
  { icon: '🎮', title: 'مدينة الألعاب', desc: '14 لعبة علمية ممتعة', to: '/games' },
  { icon: '🎯', title: 'تحديات نافس', desc: 'أسئلة بنمط اختبار نافس', to: '/assessments?type=mock' },
  { icon: '🏆', title: 'المسابقات', desc: 'تنافسي مع زميلاتكِ', to: '/competitions' },
  { icon: '📚', title: 'التعلم العلاجي', desc: 'تقوية النقاط الضعيفة', to: '/dashboard' },
  { icon: '🏅', title: 'إنجازاتي', desc: 'أوسمتي وشهاداتي', to: '/achievements' },
  { icon: '🥇', title: 'لوحة المتصدرات', desc: 'ترتيب الطالبات', to: '/leaderboard' },
  { icon: '👩‍🏫', title: 'لوحة المعلمة', desc: 'إدارة المنصة والتحليلات', to: '/teacher' },
];

export default function Home() {
  const { user } = useAuth();
  const [info, setInfo] = useState<Info | null>(null);
  useEffect(() => {
    fetch('/api/public/info').then(r => r.json()).then(setInfo).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy via-[#14395a] to-navy text-white">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-16 text-center">
        <div className="text-6xl mb-4">🔭🧬⚗️</div>
        <h1 className="text-3xl md:text-5xl font-extrabold mb-3">
          {info?.platform_name_ar || 'دوري محطات نواتج التعلّم – العلوم'}
        </h1>
        <p className="text-turquoise text-lg md:text-xl mb-2">"كل محطة اكتشاف، وكل تحدٍّ إتقان، وكل إنجاز يقود إلى التميّز"</p>
        <p className="text-white/70 mb-8">
          {info?.school_name} | {info?.school_name_en} | المعلمة: {info?.teacher_name} | مديرة المدرسة: {info?.principal_name} | {info?.academic_year}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {user ? (
            <Link to={user.role === 'teacher' ? '/teacher' : '/dashboard'} className="btn-gold text-lg px-8 py-4">
              {user.role === 'teacher' ? 'لوحة المعلمة' : 'لوحتي'}
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-gold text-lg px-8 py-4">سجّلي دخولكِ</Link>
              <Link to="/login" className="btn border-2 border-white/40 text-white hover:bg-white/10 text-lg px-8 py-4">دخول المعلمة</Link>
            </>
          )}
        </div>
        <Link to={user ? (user.role === 'teacher' ? '/teacher' : '/dashboard') : '/login'} className="inline-block mt-6 text-turquoise font-bold text-lg hover:underline">
          ابدئي رحلتكِ العلمية ←
        </Link>
      </div>

      {/* Feature cards */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-extrabold text-center mb-8 text-gold">استكشفي عالم العلوم</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {cards.map(c => (
            <Link key={c.title} to={c.to}
              className="bg-white/10 hover:bg-white/20 backdrop-blur rounded-2xl p-5 text-center transition border border-white/10 hover:border-turquoise/50">
              <div className="text-4xl mb-2">{c.icon}</div>
              <div className="font-bold text-sm md:text-base">{c.title}</div>
              <div className="text-xs text-white/60 mt-1">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      <footer className="text-center text-white/50 text-sm pb-8">
        Science Learning Outcomes Championship | {info?.academic_year || '1448هـ'}
      </footer>
    </div>
  );
}
