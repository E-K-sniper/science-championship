import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

const typeLabels: Record<string, string> = {
  diagnostic: '🩺 تشخيصي', station: '📍 محطة', daily: '📅 يومي', weekly: '📆 أسبوعي',
  mock: '🎯 محاكاة نافس', remedial: '📚 علاجي', final: '🏁 ختامي', competition: '🏆 مسابقة',
};

export default function AssessmentsList() {
  const [items, setItems] = useState<any[]>([]);
  const [params] = useSearchParams();
  const filter = params.get('type');

  useEffect(() => {
    api<any[]>(`/assessments${filter ? `?type=${filter}` : ''}`).then(setItems).catch(() => {});
  }, [filter]);

  const grouped = items.reduce((acc: any, a) => { (acc[a.type] ||= []).push(a); return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-navy">📝 الاختبارات والتحديات</h1>
        <p className="text-slate-500 text-sm mt-1">اختبارات بنمط نافس مع تصحيح فوري وشرح للإجابات</p>
      </div>
      {Object.entries(grouped).map(([type, list]: [string, any]) => (
        <div key={type} className="card">
          <h2 className="font-extrabold text-navy mb-3">{typeLabels[type] || type}</h2>
          <div className="space-y-3">
            {list.map((a: any) => {
              const done = (a.attempts_count || 0) > 0;
              return (
                <div key={a.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-4 flex-wrap gap-3">
                  <div>
                    <div className="font-bold">{a.title_ar}</div>
                    <div className="text-xs text-slate-500">
                      {a.question_count} أسئلة • {a.time_limit_min} دقيقة
                      {a.station_title_ar && ` • ${a.station_title_ar}`}
                      {done && ` • أفضل نتيجة: ${a.best_percentage}% (${a.attempts_count} محاولة)`}
                    </div>
                  </div>
                  {done ? (
                    <div className="flex gap-2">
                      <Link to={`/assessments/${a.id}/take`} className="btn-outline !py-2 text-sm">إعادة</Link>
                      <span className="badge-chip bg-emerald-100 text-emerald-700">مكتمل ✓</span>
                    </div>
                  ) : (
                    <Link to={`/assessments/${a.id}/take`} className="btn-primary !py-2">ابدئي ←</Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="card text-center text-slate-400 py-10">لا توجد اختبارات بعد</div>}
    </div>
  );
}
