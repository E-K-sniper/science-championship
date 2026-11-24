import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await login(email, password);
      const me = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('scc_token')}` } }).then(r => r.json());
      nav(me.role === 'teacher' ? '/teacher' : '/dashboard');
    } catch (e: any) {
      setErr(e.message || 'بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy to-[#14395a] flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🔬</div>
          <h1 className="text-2xl font-extrabold text-navy">دوري محطات نواتج التعلّم</h1>
          <p className="text-turquoise font-bold">العلوم | المدرسة السادسة عشر</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">البريد الإلكتروني</label>
            <input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@school.edu" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">كلمة المرور</label>
            <input className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-bold">{err}</div>}
          <button className="btn-primary w-full text-lg" disabled={loading}>{loading ? 'جاري الدخول...' : 'دخول'}</button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-500">
          حساب تجريبي — طالبة: <code className="bg-slate-100 px-2 rounded">sara@student.edu / 123456</code><br />
          معلمة: <code className="bg-slate-100 px-2 rounded">teacher@science.edu / teacher123</code>
        </div>
        <div className="mt-3 text-center"><Link to="/" className="text-turquoise font-bold text-sm hover:underline">← العودة للرئيسية</Link></div>
      </div>
    </div>
  );
}
