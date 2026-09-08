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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-600" />
            Physics-Informed Digital Twin & Telemetry Comparison
          </h2>
          <p className="text-xs text-slate-500">
            Real-time electro-mechanical and lumped-parameter thermal physics equations vs live physical sensor signals
          </p>
        </div>
      </div>

      {/* Physics Equations Header Summary */}
      <div className="aerospace-card p-4 bg-gradient-to-r from-sky-50 via-white to-sky-50 border-sky-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-white border border-sky-100 shadow-2xs">
            <span className="text-[10px] text-slate-400 block mb-0.5">ELECTRICAL POWER</span>
            <strong className="text-slate-800">P_elec = V_applied × I</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-sky-100 shadow-2xs">
            <span className="text-[10px] text-slate-400 block mb-0.5">ANGULAR VELOCITY</span>
            <strong className="text-slate-800">ω = 2π × RPM / 60</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-sky-100 shadow-2xs">
            <span className="text-[10px] text-slate-400 block mb-0.5">MECHANICAL POWER</span>
            <strong className="text-slate-800">P_mech = τ_load × ω</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-sky-100 shadow-2xs">
            <span className="text-[10px] text-slate-400 block mb-0.5">THERMAL ODE</span>
            <strong className="text-slate-800">C_th(dT/dt) = P_loss - ΔT/R_th</strong>
          </div>
        </div>
      </div>

      {/* Real-time Dynamic Comparison Curves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* RPM Actual vs Expected */}
        <div className="aerospace-card p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Rotational Speed: Actual vs Physics Expected
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-sky-600 font-bold">ACTUAL</span>
              <span className="text-slate-400 font-bold">EXPECTED</span>
            </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" hide />
                <YAxis stroke="#94a3b8" fontSize={10} fontStyle="monospace" />
                <Tooltip />
                <Line type="monotone" dataKey="actualRpm" stroke="#0284c7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expectedRpm" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Temperature Actual vs Expected */}
        <div className="aerospace-card p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Stator Temperature: Actual vs Lumped Thermal Model
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-amber-600 font-bold">ACTUAL</span>
              <span className="text-slate-400 font-bold">EXPECTED</span>
            </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" hide />
                <YAxis stroke="#94a3b8" fontSize={10} fontStyle="monospace" />
                <Tooltip />
                <Line type="monotone" dataKey="actualTemp" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expectedTemp" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Validated Channels Table */}
      <div className="aerospace-card p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Currently Validated Sensor Channels (BLDC Physical Testbed)
            </h3>
          </div>
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
