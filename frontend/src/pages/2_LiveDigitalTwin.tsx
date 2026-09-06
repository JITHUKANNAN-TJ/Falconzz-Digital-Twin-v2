import React from 'react';
import { Cpu, Zap, Activity, Info, BarChart2 } from 'lucide-react';
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
    actualRpm: h.telemetry.rpm,
    expectedRpm: h.digital_twin.expected_rpm,
    actualTemp: h.telemetry.temperature_c,
    expectedTemp: h.digital_twin.expected_temperature_c,
    actualCurrent: h.telemetry.current_a,
    expectedCurrent: h.digital_twin.expected_current_a,
    actualEff: h.telemetry.efficiency_pct,
    expectedEff: h.digital_twin.expected_efficiency_pct
  }));

  const validatedChannels = [
    { name: 'Rotational Speed', actual: `${tel.rpm.toFixed(0)} RPM`, expected: `${dt.expected_rpm.toFixed(0)} RPM`, residual: `${res.residual_rpm > 0 ? '+' : ''}${res.residual_rpm.toFixed(0)} RPM`, status: Math.abs(res.residual_rpm) > 300 ? 'DEVIATING' : 'MATCHED' },
    { name: 'Stator Temperature', actual: `${tel.temperature_c.toFixed(1)} °C`, expected: `${dt.expected_temperature_c.toFixed(1)} °C`, residual: `${res.residual_temperature_c > 0 ? '+' : ''}${res.residual_temperature_c.toFixed(1)} °C`, status: res.residual_temperature_c > 12 ? 'HIGH RESIDUAL' : 'MATCHED' },
    { name: 'Electrical Current', actual: `${tel.current_a.toFixed(2)} A`, expected: `${dt.expected_current_a.toFixed(2)} A`, residual: `${res.residual_current_a > 0 ? '+' : ''}${res.residual_current_a.toFixed(2)} A`, status: res.residual_current_a > 3 ? 'OVER-CURRENT' : 'MATCHED' },
    { name: 'Applied Electrical Power', actual: `${tel.power_elec_w.toFixed(1)} W`, expected: `${dt.expected_power_elec_w.toFixed(1)} W`, residual: `${res.residual_power_w > 0 ? '+' : ''}${res.residual_power_w.toFixed(1)} W`, status: 'MATCHED' },
    { name: 'Mechanical Output Power', actual: `${tel.power_mech_w.toFixed(1)} W`, expected: `${dt.expected_power_mech_w.toFixed(1)} W`, residual: `${(tel.power_mech_w - dt.expected_power_mech_w).toFixed(1)} W`, status: 'MATCHED' },
    { name: 'System Efficiency', actual: `${tel.efficiency_pct.toFixed(1)} %`, expected: `${dt.expected_efficiency_pct.toFixed(1)} %`, residual: `${res.residual_efficiency_pct > 0 ? '+' : ''}${res.residual_efficiency_pct.toFixed(1)} %`, status: res.residual_efficiency_pct < -10 ? 'EFFICIENCY LOSS' : 'MATCHED' },
    { name: 'Vibration Magnitude', actual: `${tel.vibration_rms_g.toFixed(3)} g`, expected: `${dt.expected_vibration_rms_g.toFixed(3)} g`, residual: `${res.residual_vibration_g > 0 ? '+' : ''}${res.residual_vibration_g.toFixed(3)} g`, status: res.residual_vibration_g > 0.25 ? 'ELEVATED' : 'MATCHED' },
  ];

  const proxyFutureChannels = [
    { name: 'Cylinder Head Temp (CHT)', value: tel.cht_c !== null ? `${tel.cht_c} °C` : 'UNAVAILABLE (AERO-PISTON REQUIRED)', badge: 'FUTURE' as const, note: 'Mapped to winding thermal model analog in proxy simulation' },
    { name: 'Exhaust Gas Temp (EGT)', value: tel.egt_c !== null ? `${tel.egt_c} °C` : 'UNAVAILABLE (AERO-PISTON REQUIRED)', badge: 'FUTURE' as const, note: 'Engine exhaust gas temperature monitoring' },
    { name: 'Engine Oil Pressure', value: tel.oil_pressure_psi !== null ? `${tel.oil_pressure_psi} PSI` : 'UNAVAILABLE (AERO-PISTON REQUIRED)', badge: 'FUTURE' as const, note: 'Lubrication loop pressure for future piston engine integration' },
    { name: 'Fuel Mass Flow', value: tel.fuel_flow_gph !== null ? `${tel.fuel_flow_gph} GPH` : 'UNAVAILABLE (AERO-PISTON REQUIRED)', badge: 'FUTURE' as const, note: 'Gravimetric/volumetric fuel consumption rate' },
    { name: 'Alternator Bus Current', value: tel.alternator_current_a !== null ? `${tel.alternator_current_a} A` : 'UNAVAILABLE (AERO-PISTON REQUIRED)', badge: 'FUTURE' as const, note: 'Electrical accessory generation subsystem' },
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

      {/* Future / Proxy Aero-Piston Channels */}
      <div className="aerospace-card p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Future MALE-UAV Aero-Piston Architecture Channels
            </h3>
          </div>
          <StatusBadge type="FUTURE" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {proxyFutureChannels.map((p, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200/90 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-800">{p.name}</span>
                <StatusBadge type={p.badge} />
              </div>
              <div className="font-mono text-slate-500 font-semibold mb-1">{p.value}</div>
              <p className="text-[11px] text-slate-400 font-sans">{p.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
