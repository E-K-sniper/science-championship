import { useEffect, useState } from 'react';
import { api, apiUpload } from '../../lib/api';

interface Student { id: number; display_name: string; email: string; class_name: string | null; class_id: number | null; active: number; points: number }
interface ClassItem { id: number; name: string }

export default function TeacherStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState({ display_name: '', email: '', password: '', class_id: '' });
  const [edit, setEdit] = useState<Student | null>(null);
  const [resetPw, setResetPw] = useState<{ id: number; pw: string } | null>(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    api<Student[]>('/admin/students').then(setStudents).catch(() => {});
    api<ClassItem[]>('/admin/classes').then(setClasses).catch(() => {});
  };
  useEffect(load, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const add = async () => {
    try {
      await api('/admin/students', { method: 'POST', body: JSON.stringify({ ...form, class_id: form.class_id ? parseInt(form.class_id) : null }) });
      setForm({ display_name: '', email: '', password: '', class_id: '' });
      load(); flash('تمت إضافة الطالبة ✅');
    } catch (e: any) { flash(e.message); }
  };

  const saveEdit = async () => {
    if (!edit) return;
    await api(`/admin/students/${edit.id}`, { method: 'PUT', body: JSON.stringify({ display_name: edit.display_name, email: edit.email, class_id: edit.class_id, active: edit.active }) });
    setEdit(null); load(); flash('تم الحفظ ✅');
  };

  const doReset = async () => {
    if (!resetPw) return;
    await api(`/auth/reset-password/${resetPw.id}`, { method: 'POST', body: JSON.stringify({ password: resetPw.pw }) });
    setResetPw(null); flash('تمت إعادة تعيين كلمة المرور ✅');
  };

  const remove = async (id: number) => {
    if (!confirm('حذف الطالبة نهائيًا؟')) return;
    await api(`/admin/students/${id}`, { method: 'DELETE' });
    load(); flash('تم الحذف');
  };

  const importFile = async (f: File) => {
    try {
      const res = await apiUpload('/admin/students/import', f);
      flash(`تم استيراد ${res.created}طالبة، تم تخطي ${res.skipped}`);
      load();
    } catch (e: any) { flash(e.message); }
  };

  const addClass = async () => {
    const name = prompt('اسم الصف الجديد (مثال: الصف السادس - ب):');
    if (!name) return;
    await api('/admin/classes', { method: 'POST', body: JSON.stringify({ name }) });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-navy">👩‍🎓 إدارة الطالبات</h1>
        {msg && <p className="text-emerald-600 text-sm font-bold mt-2">{msg}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-extrabold text-navy mb-3">إضافة طالبة جديدة</h2>
          <div className="space-y-2">
            <input className="input" placeholder="الاسم" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
            <input className="input" placeholder="البريد (مثال: name@student.edu)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className="input" placeholder="كلمة المرور (6+ أحرف)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <select className="input" value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })}>
              <option value="">بدون صف</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={add} className="btn-primary w-full">إضافة</button>
          </div>
        </div>
        <div className="card">
          <h2 className="font-extrabold text-navy mb-3">استيراد من ملف (Excel/CSV)</h2>
          <p className="text-xs text-slate-500 mb-3">الأعمدة: name, email, password, class — الأعمدة العربية مدعومة أيضًا</p>
          <input type="file" accept=".csv,.xlsx,.xls" className="input mb-3" onChange={e => e.target.files?.[0] && importFile(e.target.files[0])} />
          <button onClick={addClass} className="btn-outline w-full">➕ إضافة صف جديد</button>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr><th className="p-3 text-right">الاسم</th><th className="p-3 text-right">البريد</th><th className="p-3 text-right">الصف</th><th className="p-3 text-right">النقاط</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">إجراءات</th></tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3 font-bold">{s.display_name}</td>
                <td className="p-3" dir="ltr">{s.email}</td>
                <td className="p-3">{s.class_name || '—'}</td>
                <td className="p-3 font-extrabold text-turquoise">{s.points}</td>
                <td className="p-3">{s.active ? '✅' : '⛔'}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => setEdit({ ...s })} className="btn-outline !py-1 !px-2 text-xs">تعديل</button>
                    <button onClick={() => setResetPw({ id: s.id, pw: '' })} className="btn-outline !py-1 !px-2 text-xs">كلمة مرور</button>
                    <button onClick={() => remove(s.id)} className="btn-outline !py-1 !px-2 text-xs text-red-600 border-red-300">حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEdit(null)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-extrabold text-navy mb-4">تعديل الطالبة</h3>
            <div className="space-y-2">
              <input className="input" value={edit.display_name} onChange={e => setEdit({ ...edit, display_name: e.target.value })} />
              <input className="input" dir="ltr" value={edit.email} onChange={e => setEdit({ ...edit, email: e.target.value })} />
              <select className="input" value={edit.class_id || ''} onChange={e => setEdit({ ...edit, class_id: e.target.value ? parseInt(e.target.value) : null })}>
                <option value="">بدون صف</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label className="flex items-center gap-2 font-bold text-sm"><input type="checkbox" checked={!!edit.active} onChange={e => setEdit({ ...edit, active: e.target.checked ? 1 : 0 })} /> حساب مفعّل</label>
              <div className="flex gap-2">
                <button onClick={saveEdit} className="btn-primary flex-1">حفظ</button>
                <button onClick={() => setEdit(null)} className="btn-outline flex-1">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {resetPw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setResetPw(null)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-extrabold text-navy mb-4">إعادة تعيين كلمة المرور</h3>
            <input className="input mb-3" placeholder="كلمة المرور الجديدة" value={resetPw.pw} onChange={e => setResetPw({ ...resetPw, pw: e.target.value })} />
            <div className="flex gap-2">
              <button onClick={doReset} className="btn-primary flex-1">تعيين</button>
              <button onClick={() => setResetPw(null)} className="btn-outline flex-1">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
