import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const studentLinks = [
  { to: '/dashboard', label: 'لوحتي' },
  { to: '/stations/1', label: 'المحطات', special: true },
  { to: '/assessments', label: 'الاختبارات' },
  { to: '/games', label: 'الألعاب' },
  { to: '/lab', label: 'المختبر' },
  { to: '/competitions', label: 'المسابقات' },
  { to: '/leaderboard', label: 'المتصدرات' },
  { to: '/achievements', label: 'إنجازاتي' },
  { to: '/certificates', label: 'شهاداتي' },
];

const teacherLinks = [
  { to: '/teacher', label: 'الرئيسية', end: true },
  { to: '/teacher/students', label: 'الطالبات' },
  { to: '/teacher/questions', label: 'بنك الأسئلة' },
  { to: '/teacher/assessments', label: 'الاختبارات' },
  { to: '/teacher/competitions', label: 'المسابقات' },
  { to: '/teacher/analytics', label: 'التحليلات' },
  { to: '/teacher/reports', label: 'التقارير' },
  { to: '/teacher/certificates', label: 'الشهادات' },
  { to: '/teacher/settings', label: 'الإعدادات' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const links = user?.role === 'teacher' ? teacherLinks : studentLinks;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-navy text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-3xl">🔬</span>
            <div>
              <div className="font-extrabold text-lg leading-tight">دوري محطات نواتج التعلّم</div>
              <div className="text-xs text-turquoise">العلوم | المدرسة السادسة عشر</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            {links.map(l => (
              <Link key={l.to} to={l.to}
                className={`px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${loc.pathname === l.to || (l.to === '/teacher' && loc.pathname === '/teacher') ? 'bg-turquoise text-white' : 'hover:bg-white/10'}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:block">{user?.display_name}</span>
            <button onClick={logout} className="text-xs bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2">خروج</button>
          </div>
        </div>
        <nav className="md:hidden flex gap-1 px-3 pb-2 overflow-x-auto">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${loc.pathname === l.to ? 'bg-turquoise' : 'bg-white/10'}`}>
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="bg-navy text-white/70 text-center text-sm py-6 mt-8">
        <div>المدرسة السادسة عشر | المعلمة: موضي أحمد علي الزقلي | مديرة المدرسة: مزنه الصقور | العام الدراسي 1448هـ</div>
      </footer>
    </div>
  );
}
