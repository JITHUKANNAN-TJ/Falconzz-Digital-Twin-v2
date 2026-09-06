import React from 'react';
import { 
  X, 
  HelpCircle, 
  Info, 
  BookOpen, 
  Layers, 
  Activity, 
  Zap, 
  Thermometer, 
  Gauge,
  Radio
} from 'lucide-react';
import { useAppStore } from '../state/store';

export const PARAMETER_DICTIONARY: Record<string, { title: string; category: string; description: string; unit?: string; formula?: string; source?: string }> = {
  rpm: {
    title: 'Rotational Speed (RPM)',
    category: 'Kinematics',
    unit: 'Revolutions Per Minute',
    description: 'Motor rotational velocity measured directly from ESC telemetry feedback or optical tachometer.',
    formula: 'ω = 2π × RPM / 60 (rad/s)',
    source: 'REAL • ESC MAVLINK / RPM_SENSOR'
  },
  current: {
    title: 'Electrical Current',
    category: 'Electrical Power',
    unit: 'Amperes (A)',
    description: 'Electrical current drawn by the BLDC motor phases or total propulsion power distribution bus.',
    formula: 'P_elec = Voltage × Current',
    source: 'REAL • ESC_TELEM / BATTERY_STATUS'
  },
  voltage: {
    title: 'Electrical Voltage',
    category: 'Electrical Power',
    unit: 'Volts (V)',
    description: 'Electrical potential supplied by the LiPo battery pack to the electronic speed controllers (ESCs).',
    source: 'REAL • BATTERY_STATUS / ESC_TELEMETRY'
  },
  temperature: {
    title: 'Stator / ESC Temperature',
    category: 'Thermal Subsystem',
    unit: 'Degrees Celsius (°C)',
    description: 'Thermal state of motor stator copper windings and ESC MOSFET switches.',
    formula: 'C_th(dT/dt) = P_loss - ΔT / R_th',
    source: 'REAL • ESC_TEMPERATURE / SENSOR'
  },
  vibration: {
    title: 'Vibration RMS Acceleration',
    category: 'Structural Dynamics',
    unit: 'g-force (g)',
    description: 'Root-Mean-Square (RMS) structural acceleration derived from the high-rate 3-axis IMU accelerometer.',
    formula: 'RMS = sqrt((x² + y² + z²) / 3)',
    source: 'REAL • RAW_IMU / HIGHRES_IMU'
  },
  health: {
    title: 'Overall Propulsion Health Index',
    category: 'Intelligence & Diagnostics',
    unit: 'Percentage (%)',
    description: 'Model-based composite health score derived from physics residuals, anomaly status, and degradation trend.',
    formula: 'Health = max(0, 100 - CompositeResidualPenalty - AnomalyPenalty)',
    source: 'DERIVED • PHYSICS TWIN & RESIDUAL ENGINE'
  },
  anomaly: {
    title: 'Telemetry Anomaly Score',
    category: 'AI / Statistical Inference',
    unit: 'Z-Score / Likelihood',
    description: 'Indicates multi-channel sensor behavior that differs significantly from learned nominal baseline.',
    source: 'DERIVED • ISOLATION FOREST & HYSTERESIS'
  },
  prediction: {
    title: 'Degradation Prediction',
    category: 'Predictive Intelligence',
    description: 'Physics-informed machine learning estimate of potential future performance degradation if current trend persists.',
    source: 'DERIVED • GRADIENT BOOSTED RESIDUAL CLASSIFIER'
  },
  rul: {
    title: 'Remaining Useful Life (RUL)',
    category: 'Prognostics',
    unit: 'Operating Hours',
    description: 'Estimated operating time remaining before propulsion performance drops below safe threshold. Requires validated empirical degradation history.',
    source: 'DERIVED • WEIBULL & QUANTILE REGRESSION (OR INSUFFICIENT DATA)'
  },
  telemetry_age: {
    title: 'Telemetry Age / Latency',
    category: 'Link Quality',
    unit: 'Milliseconds (ms)',
    description: 'Elapsed wall-clock time since the most recent verified telemetry packet was received by the GCS.',
    source: 'DERIVED • SYSTEM TIMESTAMP DELTA'
  },
  packet_loss: {
    title: 'Packet Loss Rate',
    category: 'Link Quality',
    unit: 'Percentage (%) / Packet Count',
    description: 'Fraction of expected MAVLink sequence numbers that failed to reach the ground control station.',
    source: 'DERIVED • MAVLINK PACKET SEQUENCE DELTA'
  }
};

export const ParameterHelpModal: React.FC = () => {
  const { helpModalParam, setHelpModalParam } = useAppStore();

  if (!helpModalParam) return null;

  const currentInfo = PARAMETER_DICTIONARY[helpModalParam.toLowerCase()] || {
    title: helpModalParam.toUpperCase(),
    category: 'Telemetry Channel',
    description: 'Hardware measurement and diagnostics channel monitored in real time.'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs select-none">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                {currentInfo.category}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                {currentInfo.title}
              </h3>
            </div>
          </div>

          <button
            onClick={() => setHelpModalParam(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
              PHYSICAL DEFINITION
            </span>
            <p className="font-sans text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              {currentInfo.description}
            </p>
          </div>

          {currentInfo.formula && (
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                GOVERNING EQUATION
              </span>
              <div className="p-2.5 rounded-lg bg-sky-500/5 dark:bg-sky-950/30 border border-sky-500/20 text-sky-700 dark:text-sky-300 font-bold">
                {currentInfo.formula}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            {currentInfo.unit && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">ENGINEERING UNIT</span>
                <strong className="text-slate-900 dark:text-white">{currentInfo.unit}</strong>
              </div>
            )}
            {currentInfo.source && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">DATA PROVENANCE</span>
                <strong className="text-sky-600 dark:text-sky-400 truncate block">{currentInfo.source}</strong>
              </div>
            )}
          </div>

          {/* Provenance Legend Guide */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 text-[11px] font-sans">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5 font-bold">
              Data Classification Badges
            </span>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">REAL</span>
                <span className="text-slate-500">Hardware Telemetry</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold">DERIVED</span>
                <span className="text-slate-500">Calculated Value</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">PROXY</span>
                <span className="text-slate-500">Estimated Signal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">UNAVAILABLE</span>
                <span className="text-slate-500">No Sensor Link</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={() => setHelpModalParam(null)}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold font-sans transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
