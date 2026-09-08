import React from 'react';
import { Cpu, Activity } from 'lucide-react';
import { useAppStore } from '../state/store';
import { StatusBadge } from '../components/StatusBadge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const LiveDigitalTwinPage: React.FC = () => {
  const { systemState, history } = useAppStore();

  if (!systemState) return null;

  const tel = systemState.telemetry;
  const dt = systemState.digital_twin;
  const res = systemState.residuals;

  const chartData = history.map((h, i) => ({
    time: i,
    actualRpm: h.telemetry?.rpm ?? 0,
    expectedRpm: h.digital_twin?.expected_rpm ?? 0,
    actualTemp: h.telemetry?.temperature_c ?? 25,
    expectedTemp: h.digital_twin?.expected_temperature_c ?? 25,
    actualCurrent: h.telemetry?.current_a ?? 0,
    expectedCurrent: h.digital_twin?.expected_current_a ?? 0,
    actualEff: h.telemetry?.efficiency_pct ?? 0,
    expectedEff: h.digital_twin?.expected_efficiency_pct ?? 0
  }));

  const resRpm = res.residual_rpm ?? 0;
  const resTemp = res.residual_temperature_c ?? 0;
  const resCurr = res.residual_current_a ?? 0;
  const resPwr = res.residual_power_w ?? 0;
  const resEff = res.residual_efficiency_pct ?? 0;
  const resVib = res.residual_vibration_g ?? 0;

  const validatedChannels = [
    { name: 'Rotational Speed', actual: `${(tel.rpm ?? 0).toFixed(0)} RPM`, expected: `${(dt.expected_rpm ?? 0).toFixed(0)} RPM`, residual: `${resRpm > 0 ? '+' : ''}${resRpm.toFixed(0)} RPM`, status: Math.abs(resRpm) > 300 ? 'DEVIATING' : 'MATCHED' },
    { name: 'Stator Temperature', actual: `${(tel.temperature_c ?? 25).toFixed(1)} °C`, expected: `${(dt.expected_temperature_c ?? 25).toFixed(1)} °C`, residual: `${resTemp > 0 ? '+' : ''}${resTemp.toFixed(1)} °C`, status: resTemp > 12 ? 'HIGH RESIDUAL' : 'MATCHED' },
    { name: 'Electrical Current', actual: `${(tel.current_a ?? 0).toFixed(2)} A`, expected: `${(dt.expected_current_a ?? 0).toFixed(2)} A`, residual: `${resCurr > 0 ? '+' : ''}${resCurr.toFixed(2)} A`, status: resCurr > 3 ? 'OVER-CURRENT' : 'MATCHED' },
    { name: 'Applied Electrical Power', actual: `${(tel.power_elec_w ?? 0).toFixed(1)} W`, expected: `${(dt.expected_power_elec_w ?? 0).toFixed(1)} W`, residual: `${resPwr > 0 ? '+' : ''}${resPwr.toFixed(1)} W`, status: 'MATCHED' },
    { name: 'Mechanical Output Power', actual: `${(tel.power_mech_w ?? 0).toFixed(1)} W`, expected: `${(dt.expected_power_mech_w ?? 0).toFixed(1)} W`, residual: `${((tel.power_mech_w ?? 0) - (dt.expected_power_mech_w ?? 0)).toFixed(1)} W`, status: 'MATCHED' },
    { name: 'System Efficiency', actual: `${(tel.efficiency_pct ?? 0).toFixed(1)} %`, expected: `${(dt.expected_efficiency_pct ?? 0).toFixed(1)} %`, residual: `${resEff > 0 ? '+' : ''}${resEff.toFixed(1)} %`, status: resEff < -10 ? 'EFFICIENCY LOSS' : 'MATCHED' },
    { name: 'Vibration Magnitude', actual: `${(tel.vibration_rms_g ?? 0.05).toFixed(3)} g`, expected: `${(dt.expected_vibration_rms_g ?? 0.05).toFixed(3)} g`, residual: `${resVib > 0 ? '+' : ''}${resVib.toFixed(3)} g`, status: resVib > 0.25 ? 'ELEVATED' : 'MATCHED' },
  ];

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight flex items-center gap-2.5" style={{ color: 'var(--text)' }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Cpu className="w-4 h-4" /></span>
            Digital Twin & Telemetry Comparison
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Electro-mechanical + lumped thermal physics vs live sensor signals</p>
        </div>
      </div>
      <div className="aerospace-card p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          {[
            ['ELECTRICAL POWER','P_elec = V × I'],
            ['ANGULAR VELOCITY','ω = 2π · RPM / 60'],
            ['MECHANICAL POWER','P_mech = τ · ω'],
            ['THERMAL ODE','C_th dT/dt = P_loss − ΔT/R_th'],
          ].map(([k,v])=>(
            <div key={k} className="p-3 rounded-xl border text-center" style={{ background: 'color-mix(in srgb, var(--bg) 65%, var(--card))', borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-bold tracking-[0.08em] uppercase block" style={{ color: 'var(--text-faint)' }}>{k}</span>
              <strong className="text-[12px] mt-1 block tabular-nums" style={{ color: 'var(--text)' }}>{v}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="aerospace-card p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text)' }}>Rotational Speed — Actual vs Expected</span>
            <div className="flex items-center gap-2 text-[11px] font-semibold"><span className="w-2 h-2 rounded-full bg-sky-600" />Actual <span className="w-3 h-0.5 bg-slate-300 rounded" />Expected</div>
          </div>
          <div className="h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="time" hide /><YAxis stroke="var(--text-faint)" fontSize={11} width={42} tick={{ fontFamily: 'JetBrains Mono' }} /><Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }} /><Line type="monotone" dataKey="actualRpm" stroke="#0284c7" strokeWidth={1.5} dot={false} /><Line type="monotone" dataKey="expectedRpm" stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="4 4" dot={false} /></LineChart></ResponsiveContainer></div>
        </div>
        <div className="aerospace-card p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text)' }}>Stator Temperature — Actual vs Model</span>
            <div className="flex items-center gap-2 text-[11px] font-semibold"><span className="w-2 h-2 rounded-full bg-amber-500" />Actual <span className="w-3 h-0.5 bg-slate-300 rounded" />Expected</div>
          </div>
          <div className="h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="time" hide /><YAxis stroke="var(--text-faint)" fontSize={11} width={42} tick={{ fontFamily: 'JetBrains Mono' }} /><Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }} /><Line type="monotone" dataKey="actualTemp" stroke="#d97706" strokeWidth={1.5} dot={false} /><Line type="monotone" dataKey="expectedTemp" stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="4 4" dot={false} /></LineChart></ResponsiveContainer></div>
        </div>
      </div>

      <div className="aerospace-card p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2"><Activity className="w-4 h-4" style={{ color: 'var(--success)' }} /><span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text)' }}>Validated Sensor Channels — BLDC Testbed</span></div>
          <StatusBadge type="VALIDATED" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold text-[11px]">
                <th className="py-2 px-3">PARAMETER</th>
                <th className="py-2 px-3">ACTUAL MEASURED</th>
                <th className="py-2 px-3">PHYSICS EXPECTED</th>
                <th className="py-2 px-3">RESIDUAL (Δ)</th>
                <th className="py-2 px-3">TWIN STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {validatedChannels.map((ch, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-3 font-semibold text-slate-900">{ch.name}</td>
                  <td className="py-2 px-3 font-bold text-sky-700">{ch.actual}</td>
                  <td className="py-2 px-3 text-slate-500">{ch.expected}</td>
                  <td className="py-2 px-3 font-semibold">{ch.residual}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ch.status === 'MATCHED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {ch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
