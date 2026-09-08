import React from 'react';
import { Activity, AlertTriangle, ShieldCheck, Flame, BarChart3 } from 'lucide-react';
import { useAppStore } from '../state/store';
import { StatusBadge } from '../components/StatusBadge';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const HealthIntelligencePage: React.FC = () => {
  const { systemState, history } = useAppStore();

  if (!systemState) return null;

  const intel = systemState.intelligence;
  const res = systemState.residuals;

  const healthData = history.map((h, i) => ({
    time: i,
    health: h.intelligence?.health_index ?? 100,
    anomaly: h.intelligence?.anomaly_score ?? 0,
    compositeRes: h.residuals?.composite_residual_score ?? 0
  }));

  const residualHeatmap = [
    { label: 'Normalized Stator Temp Residual', value: res.norm_residual_temp ?? 0, unit: 'σ', status: Math.abs(res.norm_residual_temp ?? 0) > 3 ? 'CRITICAL' : Math.abs(res.norm_residual_temp ?? 0) > 1.8 ? 'WARNING' : 'NORMAL' },
    { label: 'Normalized Vibration Residual', value: res.norm_residual_vibration ?? 0, unit: 'σ', status: Math.abs(res.norm_residual_vibration ?? 0) > 3 ? 'CRITICAL' : Math.abs(res.norm_residual_vibration ?? 0) > 1.8 ? 'WARNING' : 'NORMAL' },
    { label: 'Normalized Phase Current Residual', value: res.norm_residual_current ?? 0, unit: 'σ', status: Math.abs(res.norm_residual_current ?? 0) > 3 ? 'CRITICAL' : Math.abs(res.norm_residual_current ?? 0) > 1.8 ? 'WARNING' : 'NORMAL' },
    { label: 'Normalized RPM Deviation', value: res.norm_residual_rpm ?? 0, unit: 'σ', status: Math.abs(res.norm_residual_rpm ?? 0) > 3 ? 'CRITICAL' : Math.abs(res.norm_residual_rpm ?? 0) > 1.8 ? 'WARNING' : 'NORMAL' },
    { label: 'Normalized Efficiency Loss', value: res.norm_residual_efficiency ?? 0, unit: 'σ', status: Math.abs(res.norm_residual_efficiency ?? 0) > 3 ? 'CRITICAL' : Math.abs(res.norm_residual_efficiency ?? 0) > 1.8 ? 'WARNING' : 'NORMAL' }
  ];

  const healthIndex = intel.health_index ?? 100;
  const anomalyScore = intel.anomaly_score ?? 0;
  const compResScore = res.composite_residual_score ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600" />
          Health Intelligence & Dynamic Degradation Diagnostics
        </h2>
        <p className="text-xs text-slate-500">
          Isolation Forest Anomaly Scoring with 3-5 sample temporal hysteresis and composite residual deviation
        </p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="aerospace-card p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">Composite Health Score</span>
            <StatusBadge type="HEALTH" value={intel.health_band || 'HEALTHY'} />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900 my-1">
            {healthIndex.toFixed(1)}%
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full transition-all duration-300 ${
                healthIndex >= 90
                  ? 'bg-emerald-500'
                  : healthIndex >= 70
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${healthIndex}%` }}
            />
          </div>
        </div>

        <div className="aerospace-card p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">Isolation Forest Anomaly Score</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${intel.is_anomaly ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {intel.is_anomaly ? 'ANOMALY DETECTED' : 'NORMAL'}
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900 my-1">
            {anomalyScore.toFixed(1)}
          </div>
          <p className="text-[11px] text-slate-500">
            Temporal Hysteresis Count: <strong className="font-mono text-slate-800">{intel.anomaly_hysteresis_count ?? 0} / 5</strong>
          </p>
        </div>

        <div className="aerospace-card p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">Composite Residual Distance</span>
            <span className="text-[10px] font-mono text-slate-400">EUCLIDEAN Z-SPACE</span>
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900 my-1">
            {compResScore.toFixed(2)}σ
          </div>
          <p className="text-[11px] text-slate-500">
            Anomaly Threshold: <strong className="font-mono text-slate-800">2.20σ</strong>
          </p>
        </div>
      </div>

      {/* Health Trend Timeline */}
      <div className="aerospace-card p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Continuous Health Index & Anomaly Score Progression
          </h3>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-emerald-600 font-bold">HEALTH INDEX (%)</span>
            <span className="text-rose-500 font-bold">ANOMALY SCORE</span>
          </div>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={healthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} fontStyle="monospace" />
              <Tooltip />
              <Area type="monotone" dataKey="health" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.15} />
              <Area type="monotone" dataKey="anomaly" stroke="#f43f5e" strokeWidth={1.5} fill="#f43f5e" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Normalized Residuals Heatmap */}
      <div className="aerospace-card p-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Physics Residual Deviation Heatmap (Z-Scores Relative to Digital Twin)
        </h3>

        <div className="space-y-3">
          {residualHeatmap.map((item, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-800 w-64">{item.label}</span>
              <div className="flex-1 flex items-center gap-3">
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      item.status === 'CRITICAL' ? 'bg-rose-500' : item.status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.abs(item.value) * 20)}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-slate-900 w-16 text-right">
                  {item.value > 0 ? `+${item.value.toFixed(2)}` : item.value.toFixed(2)} {item.unit}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-20 text-center ${
                item.status === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : item.status === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
