import { downloadAuthed } from '../../lib/api';

export default function TeacherReports() {
  const reports = [
    { title: 'تقرير شامل للطالبات', desc: 'أسماء، صفوف، نقاط، محطات مكتملة، متوسط الدرجات', file: 'students.xlsx', path: '/admin/reports/students.xlsx' },
    { title: 'تقرير المحطات', desc: 'أداء كل محطة على مستوى المدرسة', file: 'stations.csv', path: null },
    { title: 'تقرير الأسئلة الصعبة', desc: 'الأسئلة الأعلى معدل أخطاء', file: 'missed.csv', path: null },
  ];

  const dl = (path: string | null, file: string) => {
    if (path) downloadAuthed(path, file).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-navy">📄 التقارير والتصدير</h1>
        <p className="text-slate-500 text-sm mt-1">تصدير التقارير بصيغة Excel/CSV لطباعتها أو مشاركتها</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {reports.map(r => (
          <div key={r.title} className="card flex items-center justify-between">
            <div>
              <div className="font-extrabold text-navy">{r.title}</div>
              <div className="text-xs text-slate-500 mt-1">{r.desc}</div>
            </div>
            <button onClick={() => dl(r.path, r.file)} disabled={!r.path} className="btn-primary !py-2 !px-4 text-sm">⬇️ تنزيل</button>
          </div>
        ))}
      </div>
      <div className="card">
        <h2 className="font-extrabold text-navy mb-3">📋 أنواع التقارير المتاحة</h2>
        <ul className="text-sm text-slate-600 space-y-2 list-disc pr-5">
          <li>تقرير فردي لكل طالبة: الدرجات، الإتقان، التقدم، الأوسمة</li>
          <li>تقرير صفّي: مقارنة أداء الصفوف</li>
          <li>تقرير نواتج التعلم: أي المهارات تحتاج تقوية</li>
          <li>تقرير الأسئلة: الأكثر خطأً والأقل تمييزًا</li>
          <li>تقرير التحسن: مقارنة التقييم القبلي والبعدي</li>
          <li>توصيات التعلم العلاجي لكل طالبة</li>
        </ul>
      </div>
    </div>
  );
}
