import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import ExperimentRunner from '../components/ExperimentRunner';

export default function VirtualLab() {
  const [stations, setStations] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api<any[]>('/stations').then(async list => {
      const detailed = await Promise.all(list.map(s => api<any>(`/stations/${s.id}`).catch(() => null)));
      setStations(detailed.filter(Boolean));
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-extrabold text-navy">🔬 المختبر الافتراضي</h1>
        <p className="text-slate-500 text-sm mt-1">تجارب علمية تفاعلية تحاكي التجارب الحقيقية — كل تجربة تكسبكِ 30 نقطة</p>
      </div>
      {stations.map(s => {
        const exps = s.experiments || [];
        if (!exps.length) return null;
        return (
          <div key={s.id} className="card">
            <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{s.icon}</span>
                <div className="text-right">
                  <div className="font-extrabold text-navy">{s.title_ar}</div>
                  <div className="text-xs text-slate-500">{exps.length} تجربة</div>
                </div>
              </div>
              <span className="text-turquoise font-bold">{expanded === s.id ? '▲' : '▼'}</span>
            </button>
            {expanded === s.id && (
              <div className="mt-4 space-y-4">
                {exps.map((e: any) => <ExperimentRunner key={e.id} experiment={e} />)}
                <Link to={`/stations/${s.id}?tab=experiment`} className="text-turquoise text-sm font-bold hover:underline">فتح في صفحة المحطة ←</Link>
              </div>
            )}
          </div>
        );
      })}
      {stations.length === 0 && <div className="card text-center text-slate-400 py-10">جاري التحميل...</div>}
    </div>
  );
}
