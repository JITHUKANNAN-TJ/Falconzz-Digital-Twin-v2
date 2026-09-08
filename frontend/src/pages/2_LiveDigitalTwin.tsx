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
  const chartData = history.map(h => ({
    actualRpm: h.telemetry?.rpm ?? 0,
    expectedRpm: h.digital_twin?.expected_rpm ?? 0,
    actualTemp: h.telemetry?.temperature_c ?? 25,
    expectedTemp: h.digital_twin?.expected_temperature_c ?? 25,
  }));
  const rows = [
    { name: 'Rotational Speed', actual: `${(tel.rpm ?? 0).toFixed(0)} RPM`, expected: `${(dt.expected_rpm ?? 0).toFixed(0)} RPM`, delta: `${(res.residual_rpm ?? 0).toFixed(0)}` },
    { name: 'Temperature', actual: `${(tel.temperature_c ?? 25).toFixed(1)} °C`, expected: `${(dt.expected_temperature_c ?? 25).toFixed(1)} °C`, delta: `${(res.residual_temperature_c ?? 0).toFixed(1)}` },
    { name: 'Current', actual: `${(tel.current_a ?? 0).toFixed(2)} A`, expected: `${(dt.expected_current_a ?? 0).toFixed(2)} A`, delta: `${(res.residual_current_a ?? 0).toFixed(2)}` },
    { name: 'Power', actual: `${(tel.power_elec_w ?? 0).toFixed(1)} W`, expected: `${(dt.expected_power_elec_w ?? 0).toFixed(1)} W`, delta: `${(res.residual_power_w ?? 0).toFixed(1)}` },
  ];

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Cpu className="w-4 h-4" /> Digital Twin
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Measured vs physics — residuals in real time</p>
      </div>

      <div className="aerospace-card p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            ['P_elec = V × I', 'Electrical'],
            ['ω = 2π·RPM/60', 'Angular'],
            ['P_mech = τ·ω', 'Mechanical'],
            ['C dT/dt = P − ΔT/R', 'Thermal'],
          ].map(([eq, label]) => (
            <div key={label} className="p-3 rounded-md border text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</div>
              <div className="font-mono text-xs mt-1" style={{ color: 'var(--text)' }}>{eq}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="aerospace-card p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>RPM — Actual vs Expected</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>— dashed = expected</span>
          </div>
          <div className="h-[180px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="actualRpm" hide /><YAxis stroke="var(--text-faint)" fontSize={11} width={36} /><Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} /><Line type="monotone" dataKey="actualRpm" stroke="#0a0a0a" strokeWidth={1.5} dot={false} /><Line type="monotone" dataKey="expectedRpm" stroke="#a3a3a3" strokeWidth={1} strokeDasharray="4 4" dot={false} /></LineChart></ResponsiveContainer></div>
        </div>
        <div className="aerospace-card p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>Temperature — Actual vs Expected</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>— dashed = expected</span>
          </div>
          <div className="h-[180px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis hide /><YAxis stroke="var(--text-faint)" fontSize={11} width={36} /><Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} /><Line type="monotone" dataKey="actualTemp" stroke="#0a0a0a" strokeWidth={1.5} dot={false} /><Line type="monotone" dataKey="expectedTemp" stroke="#a3a3a3" strokeWidth={1} strokeDasharray="4 4" dot={false} /></LineChart></ResponsiveContainer></div>
        </div>
      </div>

      <div className="aerospace-card p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium flex items-center gap-2" style={{ color: 'var(--text)' }}><Activity className="w-4 h-4" /> Channels</span>
          <StatusBadge type="VALIDATED" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-[11px] uppercase tracking-wide" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="py-2 px-3 font-medium">Parameter</th>
                <th className="py-2 px-3 font-medium">Actual</th>
                <th className="py-2 px-3 font-medium">Expected</th>
                <th className="py-2 px-3 font-medium">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' } as any}>
              {rows.map(r => (
                <tr key={r.name} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                  <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--text)' }}>{r.name}</td>
                  <td className="py-2.5 px-3 tabular-nums" style={{ color: 'var(--text)' }}>{r.actual}</td>
                  <td className="py-2.5 px-3 tabular-nums" style={{ color: 'var(--text-muted)' }}>{r.expected}</td>
                  <td className="py-2.5 px-3 tabular-nums font-medium" style={{ color: 'var(--text)' }}>{r.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
