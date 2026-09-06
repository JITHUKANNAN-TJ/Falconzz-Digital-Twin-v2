import React from 'react';
import { 
  X, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  ShieldAlert, 
  Clock, 
  CheckCircle2,
  Trash2,
  Cpu
} from 'lucide-react';
import { useAppStore } from '../state/store';
import { SystemAlert } from '../types/telemetry';

export const AlertDrawer: React.FC = () => {
  const { alertDrawerOpen, setAlertDrawerOpen, activeAlerts, dismissAlert } = useAppStore();

  if (!alertDrawerOpen) return null;

  const criticalCount = activeAlerts.filter(a => a.level === 'CRITICAL').length;
  const warningCount = activeAlerts.filter(a => a.level === 'WARNING').length;
  const infoCount = activeAlerts.filter(a => a.level === 'INFO').length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={() => setAlertDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                  Active System Alerts
                </h2>
                <p className="text-[11px] text-slate-500 font-mono">
                  Hardware & Model-Derived Health Notifications
                </p>
              </div>
            </div>

            <button
              onClick={() => setAlertDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Alert Category Counts */}
          <div className="grid grid-cols-3 gap-2 px-5 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-mono bg-slate-50/50 dark:bg-slate-950/40">
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>CRITICAL: <strong>{criticalCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>WARN: <strong>{warningCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-400">
              <Info className="w-3.5 h-3.5" />
              <span>INFO: <strong>{infoCount}</strong></span>
            </div>
          </div>

          {/* Alert List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
            {activeAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-sans">
                  No Active System Alerts
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  All propulsion channels and telemetry bounds are nominal.
                </p>
              </div>
            ) : (
              activeAlerts.map((alert) => {
                const isCrit = alert.level === 'CRITICAL';
                const isWarn = alert.level === 'WARNING';

                return (
                  <div 
                    key={alert.id}
                    className={`rounded-xl border p-3.5 transition-all text-xs font-mono space-y-2.5 ${
                      isCrit
                        ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/40 text-slate-900 dark:text-slate-100'
                        : isWarn
                        ? 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/40 text-slate-900 dark:text-slate-100'
                        : 'bg-sky-500/5 dark:bg-sky-950/20 border-sky-500/30 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          isCrit
                            ? 'bg-rose-600 text-white'
                            : isWarn
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-sky-600 text-white'
                        }`}>
                          {alert.level}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {alert.target}
                        </span>
                      </div>

                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        title="Dismiss Alert"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <h4 className="font-sans font-bold text-xs text-slate-900 dark:text-white">
                        {alert.event}
                      </h4>
                    </div>

                    {/* Measured vs Limit info if present */}
                    {(alert.measured || alert.limit) && (
                      <div className="grid grid-cols-2 gap-2 bg-slate-100/80 dark:bg-slate-800/80 p-2 rounded-lg text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-500 block">MEASURED</span>
                          <strong className="text-slate-900 dark:text-white">{alert.measured}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">SAFETY LIMIT</span>
                          <strong className="text-amber-600 dark:text-amber-400">{alert.limit}</strong>
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">EVIDENCE</span>
                      <p className="mt-0.5 font-sans leading-relaxed">{alert.evidence}</p>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/5 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px]">
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 block uppercase">
                        RECOMMENDED ACTION
                      </span>
                      <p className="font-sans text-slate-800 dark:text-slate-200 font-semibold mt-0.5">
                        {alert.action}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Safety Rule: Real-Time Bounds Verification</span>
            <button
              onClick={() => setAlertDrawerOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-sans font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
