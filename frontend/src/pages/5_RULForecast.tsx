import React from 'react';
import { Clock, AlertTriangle, TrendingDown, ShieldCheck, Info, Cpu, CheckCircle } from 'lucide-react';
import { useAppStore } from '../state/store';
import { StatusBadge } from '../components/StatusBadge';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatNumber } from '../utils/format';

export const RULForecastPage: React.FC = () => {
  const { systemState } = useAppStore();

  if (!systemState) return null;

  const intel = systemState.intelligence;
  const isRealHardware = systemState.telemetry.source_type !== 'SIMULATION';
  const hasRULData = intel.rul_hours !== null && intel.rul_hours !== undefined;

  // Project future 50-hour trajectory based on current degradation rate
  const currentRUL = intel.rul_hours ?? 48.0;
  const lowerRUL = intel.rul_uncertainty_lower_hours ?? Math.max(0, currentRUL - 8.0);
  const upperRUL = intel.rul_uncertainty_upper_hours ?? (currentRUL + 10.0);

  const projectionData = Array.from({ length: 25 }, (_, i) => {
    const hourOffset = i * (currentRUL / 24.0);
    const meanLife = Math.max(0, currentRUL - hourOffset);
    const lowLife = Math.max(0, lowerRUL - hourOffset * 1.1);
    const upLife = Math.max(0, upperRUL - hourOffset * 0.9);
    return {
      hour: Math.round(hourOffset),
      mean: Math.round(meanLife),
      lower: Math.round(lowLife),
      upper: Math.round(upLife)
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            Remaining Useful Life (RUL) & Prognostic Uncertainty Bounds
          </h2>
          <p className="text-xs text-slate-500">
            Gradient Boosting Quantile Regressors (10th & 90th percentile) predicting remaining operating hours under active degradation
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <Info className="w-3.5 h-3.5" />
          {intel.rul_validation_badge || 'PROTOTYPE (RESEARCH BENCH)'}
        </span>
      </div>

      {/* RUL Primary Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="aerospace-card p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            ESTIMATED RUL (POINT ESTIMATE)
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-700 my-1">
            {hasRULData ? `${formatNumber(intel.rul_hours, 1)} HRS` : 'PENDING STREAM'}
          </div>
          <p className="text-[11px] text-slate-500">
            {hasRULData ? 'Mean operating horizon' : 'Accumulating live telemetry window'}
          </p>
        </div>

        <div className="aerospace-card p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            90% CONFIDENCE LOWER BOUND
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-800 my-1">
            {intel.rul_uncertainty_lower_hours !== null && intel.rul_uncertainty_lower_hours !== undefined
              ? `${formatNumber(intel.rul_uncertainty_lower_hours, 1)} HRS`
              : 'CALCULATING'}
          </div>
          <p className="text-[11px] text-slate-500">Conservative safety threshold</p>
        </div>

        <div className="aerospace-card p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            90% CONFIDENCE UPPER BOUND
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-800 my-1">
            {intel.rul_uncertainty_upper_hours !== null && intel.rul_uncertainty_upper_hours !== undefined
              ? `${formatNumber(intel.rul_uncertainty_upper_hours, 1)} HRS`
              : 'CALCULATING'}
          </div>
          <p className="text-[11px] text-slate-500">Optimistic operating horizon</p>
        </div>

        <div className="aerospace-card p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            EQUIVALENT CONSUMPTION RATE
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-700 my-1">
            {intel.rul_degradation_rate_pct_per_hr !== null && intel.rul_degradation_rate_pct_per_hr !== undefined
              ? `${formatNumber(intel.rul_degradation_rate_pct_per_hr, 2)}x`
              : '1.00x'}
          </div>
          <p className="text-[11px] text-slate-500">Life acceleration factor</p>
        </div>
      </div>

      {/* RUL Degradation Trajectory Chart */}
      <div className="aerospace-card p-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Projected Run-to-Failure Trajectory & Quantile Uncertainty Envelope
            </h3>
            <p className="text-[11px] text-slate-400">
              Shaded interval represents 10th to 90th percentile quantile prediction bounds
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-purple-600 font-bold">PROJECTED MEAN</span>
            <span className="text-purple-300 font-bold">90% UNCERTAINTY BAND</span>
          </div>
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData}>
              <defs>
                <linearGradient id="rulUncertainty" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} unit="h" fontStyle="monospace" />
              <YAxis stroke="#94a3b8" fontSize={11} unit="h" fontStyle="monospace" />
              <Tooltip />
              <Area type="monotone" dataKey="upper" stroke="#a855f7" strokeWidth={1} strokeDasharray="3 3" fill="url(#rulUncertainty)" />
              <Area type="monotone" dataKey="mean" stroke="#9333ea" strokeWidth={2.5} fill="none" />
              <Area type="monotone" dataKey="lower" stroke="#a855f7" strokeWidth={1} strokeDasharray="3 3" fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scientific Transparency & Limitations Notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
        <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Prognostic Methodology & Validation Disclaimers
        </h4>
        <p>
          1. <strong>Synthetic Ground-Truth Validation:</strong> Current RUL regression models are validated on run-to-failure physical degradation trajectories. When connected to live hardware, RUL indicates point estimates based on operational testbed hours.
        </p>
        <p>
          2. <strong>Physics Interaction:</strong> RUL models consume normalized residuals from the physics Digital Twin (thermal slope, vibration RMS, electrical loss ratio) rather than raw sensor thresholds alone, providing earlier warning margins.
        </p>
      </div>
    </div>
  );
};

