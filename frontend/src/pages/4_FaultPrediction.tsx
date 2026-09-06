import React from 'react';
import { AlertOctagon, ShieldAlert, Cpu, BarChart2, Layers } from 'lucide-react';
import { useAppStore } from '../state/store';
import { StatusBadge } from '../components/StatusBadge';

export const FaultPredictionPage: React.FC = () => {
  const { systemState } = useAppStore();

  if (!systemState) return null;

  const intel = systemState.intelligence;
  const res = systemState.residuals;

  const faultClasses = [
    { name: 'Normal Propulsion Baseline', key: 'NORMAL', desc: 'All physical signals adhere to physics model within ±1.5σ' },
    { name: 'Excessive Aeromechanical Load', key: 'HIGH_LOAD', desc: 'Heavy drag or headwind torque exceeding nominal cruise specification' },
    { name: 'Stator / ESC Thermal Overheating', key: 'OVERHEATING', desc: 'Winding dissipation or cooling airflow breakdown' },
    { name: 'Mechanical Bearing Raceway Defect', key: 'BEARING_DEGRADATION', desc: 'Spalling/pitting on ball bearings creating 1X vibration harmonics' },
    { name: 'Phase Winding / FET Electrical Fault', key: 'ELECTRICAL_DEGRADATION', desc: 'Partial phase short or MOSFET gate resistance increase' },
    { name: 'Optical/Hall Sensor Calibration Drift', key: 'SENSOR_DRIFT', desc: 'Telemetry sensor jitter without physical power loss' },
    { name: 'Multi-Factor Compound Degradation', key: 'COMBINED_DEGRADATION', desc: 'Simultaneous mechanical wear, thermal stress, and electrical overload' }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-amber-600" />
          Multi-Class Fault Prediction & Classification
        </h2>
        <p className="text-xs text-slate-500">
          Supervised Random Forest / Gradient Boosting Classifier trained on physics-grounded flight degradation trajectories
        </p>
      </div>

      {/* Primary Predicted Fault Banner */}
      <div className="aerospace-card p-4 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/40 via-white to-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              PRIMARY CLASSIFIED FAULT MODE
            </span>
            <h3 className="text-xl font-bold text-slate-900 font-mono">
              {intel.predicted_fault}
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">CONFIDENCE</span>
              <strong className="text-slate-800 text-sm">{intel.fault_confidence_pct.toFixed(1)}%</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">SEVERITY</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                intel.fault_severity === 'HIGH' || intel.fault_severity === 'CRITICAL'
                  ? 'bg-rose-100 text-rose-800'
                  : intel.fault_severity === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {intel.fault_severity}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fault Mode Probability Distribution & Feature Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Fault Modes List */}
        <div className="lg:col-span-7 aerospace-card p-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            Fault Mode Classification Taxonomy
          </h3>

          <div className="space-y-2.5">
            {faultClasses.map((f, idx) => {
              const isMatch = intel.predicted_fault.toLowerCase().includes(f.name.toLowerCase().split(' ')[0]);
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border transition-all text-xs ${
                    isMatch
                      ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold ${isMatch ? 'text-amber-900' : 'text-slate-800'}`}>
                      {f.name}
                    </span>
                    {isMatch && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                        ACTIVE MATCH
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Contribution Attribution */}
        <div className="lg:col-span-5 aerospace-card p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Root-Cause Feature Attributions
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">
              Contribution percentage toward the predicted fault classification:
            </p>

            <div className="space-y-3">
              {Object.entries(intel.contributing_features).map(([feat, score], idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700">{feat}</span>
                    <span className="font-mono font-bold text-slate-900">{score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${Math.min(100, score)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            <span className="font-bold text-slate-800 block mb-0.5">Scientific Evaluation:</span>
            Trained with 10-fold cross validation. Confusion matrix & test set metrics available on page 14.
          </div>
        </div>
      </div>
    </div>
  );
};
