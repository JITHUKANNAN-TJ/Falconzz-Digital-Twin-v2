import React from 'react';
import { Layers, ArrowDown, Cpu, ShieldCheck, Zap, Activity, Radio, Database, CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { useAppStore } from '../state/store';
import { StatusBadge } from '../components/StatusBadge';

export const SystemArchitecturePage: React.FC = () => {
  const { systemState } = useAppStore();
  const stages = systemState?.pipeline_stages || [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-sky-600" />
          Technical Pipeline & System Architecture Diagnostics
        </h2>
        <p className="text-xs text-slate-500">
          Real-time visibility into every single stage of the 11-stage hardware ingress, validation, digital twin, and AI pipeline.
        </p>
      </div>

      {/* LIVE 11-STAGE PIPELINE DIAGNOSTICS MONITOR */}
      <div className="aerospace-card p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            Live 11-Stage Pipeline Health & Ingress Monitor
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Source: <strong>{systemState?.data_source || 'APM_MAVLINK'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {stages.length > 0 ? (
            stages.map((stage: any, idx: number) => {
              let statusBg = 'bg-slate-50 border-slate-200 text-slate-600';
              let icon = <Clock className="w-4 h-4 text-slate-400" />;
              
              if (stage.status === 'RUNNING') {
                statusBg = 'bg-emerald-50/70 border-emerald-300 text-emerald-800';
                icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
              } else if (stage.status === 'STALE') {
                statusBg = 'bg-amber-50/70 border-amber-300 text-amber-800';
                icon = <AlertTriangle className="w-4 h-4 text-amber-600" />;
              } else if (stage.status === 'ERROR') {
                statusBg = 'bg-rose-50/70 border-rose-300 text-rose-800';
                icon = <XCircle className="w-4 h-4 text-rose-600" />;
              }

              return (
                <div key={idx} className={`p-3 rounded-lg border flex flex-col justify-between ${statusBg}`}>
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                        STAGE {idx + 1}
                      </span>
                      {icon}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mb-0.5">{stage.stage_name}</h4>
                    <p className="text-[11px] text-slate-600 truncate" title={stage.details}>
                      {stage.details || 'Active'}
                    </p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex justify-between items-center text-[10px] font-mono">
                    <span className="font-bold">{stage.status}</span>
                    {stage.message_rate_hz !== null && stage.message_rate_hz !== undefined && (
                      <span>{stage.message_rate_hz} Hz</span>
                    )}
                    {stage.latency_ms !== null && stage.latency_ms !== undefined && (
                      <span>{stage.latency_ms} ms</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-4 text-center text-slate-400 text-xs italic">
              Awaiting telemetry streaming worker initialization...
            </div>
          )}
        </div>
      </div>

      {/* End-to-End Functional Architecture Flow */}
      <div className="aerospace-card p-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-sky-600" />
          First-Principles Aerospace Propulsion Architecture
        </h3>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
            <Radio className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">1. Hardware Ingress & MAVLink Adapter:</strong>
              <p className="text-slate-600">
                Direct UART/UDP ingress decoding <code>ESC_TELEMETRY</code>, <code>SYS_STATUS</code>, <code>VFR_HUD</code>, and <code>RAW_IMU</code>. Strict channel provenance tags real BLDC testbed signals while leaving aero-piston parameters clearly marked as UNAVAILABLE.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
            <Cpu className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">2. First-Principles Digital Twin & Residual Engine:</strong>
              <p className="text-slate-600">
                Dynamic electro-mechanical power balance (P_elec = V · I, P_mech = τ · ω), lumped thermal ODE (dT/dt = (P_loss - ΔT/R_th)/C_th), and rotational vibration harmonics. Evaluates live standardized Z-score residuals without synthetic bias.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
            <Activity className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">3. Real-Time Edge AI & Prognostics:</strong>
              <p className="text-slate-600">
                27-feature rolling pipeline powering Isolation Forest anomaly detection (with temporal hysteresis) and 4-class Random Forest diagnosis (92.2% accuracy). Remaining Useful Life (RUL) strictly reports <code>INSUFFICIENT DATA</code> until validated degradation trajectories are established.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 block mb-0.5">4. Dual-Layer Safety Interlocks & XAI Advisory:</strong>
              <p className="text-slate-600">
                Triple control envelopes (Manual, Assisted, Automatic) with hard current/RPM/temp boundaries, 2.0s watchdog, and latched emergency stop ensuring real physical testbed safety.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

