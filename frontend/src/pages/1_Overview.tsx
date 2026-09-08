import React, { useState, useMemo } from 'react';
import { Activity, Cpu, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../state/store';
import { Quadcopter3DViewer } from '../three/Quadcopter3DViewer';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const OverviewPage: React.FC = () => {
  const { systemState, history, activeAlerts, theme } = useAppStore();
  const [timeRange, setTimeRange] = useState<'5m' | '10m' | '20m'>('5m');
  const [activeTab, setActiveTab] = useState<'rpm' | 'current' | 'temperature' | 'power'>('rpm');
  const isDark = theme === 'dark';

  const historySlice = useMemo(() => {
    // True time-window filtering + decimation for 5m/10m/20m
    const windowSec = timeRange === '5m' ? 300 : timeRange === '10m' ? 600 : 1200;
    const now = Date.now() / 1000;
    // If history has timestamps, filter by time; fallback to count
    let filtered = history;
    if (history.length > 0 && history[0]?.telemetry?.timestamp) {
      filtered = history.filter(h => now - (h.telemetry.timestamp ?? now) < windowSec + 2);
      if (filtered.length === 0) filtered = history;
    } else {
      const count = timeRange === '5m' ? 600 : timeRange === '10m' ? 1200 : 2400;
      filtered = history.slice(-count);
    }
    // Decimate to ≤400 points for smooth AreaChart performance
    const maxPoints = 400;
    if (filtered.length > maxPoints) {
      const step = Math.ceil(filtered.length / maxPoints);
      filtered = filtered.filter((_, i) => i % step === 0);
    }
    return filtered;
  }, [history, timeRange]);

  if (!systemState) {
    return (
      <div className="flex flex-col items-center justify-center h-[420px] gap-3">
        <div className="w-9 h-9 rounded-md border flex items-center justify-center" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <Activity className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Connecting…</p>
      </div>
    );
  }

  const tel = systemState.telemetry;
  const intel = systemState.intelligence;
  const motors = tel.motors || {};
  const isConnected = tel.connection_status === 'CONNECTED';
  const critical = activeAlerts.find(a => a.level === 'CRITICAL');

  const chartData = historySlice.map(h => {
    const ts = h.telemetry?.timestamp ?? Date.now() / 1000;
    const d = new Date(ts * 1000);
    return {
      time: d.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
      timeLabel: d.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
      rpm: h.telemetry?.rpm ?? 0,
      current: h.telemetry?.current_a ?? 0,
      temperature: h.telemetry?.temperature_c ?? 25,
      power: h.telemetry?.power_elec_w ?? 0,
    };
  });

  const getMotor = (key: 'motor_1' | 'motor_2' | 'motor_3' | 'motor_4', idx: number) => {
    const m: any = motors[key];
    const connected = m ? m.is_connected !== false && m.connection_status !== 'DISCONNECTED' : false;
    const liveRpm = connected ? (m?.live_rpm ?? 0) : 0;
    const liveCurr = connected ? (m?.current_a ?? 0) : 0;
    const liveTemp = connected ? (m?.temperature_c ?? null) : null;
    const liveThrust = connected ? (m?.thrust_g ?? 0) : 0;
    const isRunning = connected && liveRpm > 50;
    return {
      id: key,
      label: `M${idx + 1}`,
      name: `Motor ${idx + 1}`,
      connected,
      isRunning,
      rpm: liveRpm,
      thrust: liveThrust,
      current: liveCurr,
      temp: liveTemp,
    };
  };
  const motorList = [getMotor('motor_1', 0), getMotor('motor_2', 1), getMotor('motor_3', 2), getMotor('motor_4', 3)];

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {critical && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border text-sm" style={{ background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="font-medium leading-none">Attention required</div>
            <div className="text-xs opacity-80 mt-1 leading-relaxed">{critical.event} — {critical.evidence}</div>
          </div>
        </div>
      )}

      <div className="aerospace-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-[11px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Propulsion</div>
            <div className="text-[22px] font-semibold tracking-tight mt-1" style={{ color: 'var(--text)' }}>
              {isConnected ? 'System nominal' : 'Offline'}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{motorList.filter(m => m.connected).length} of 4 channels connected</div>
          </div>
          <div className="flex gap-8">
            <div>
              <div className="text-[11px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Health</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
                  {tel.source_type === 'SIMULATION' || isConnected ? `${Math.round(intel.health_index ?? 100)}%` : '—'}
                </span>
                <span className="text-xs px-2 py-1 rounded-full border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--card)' }}>
                  {intel.health_band || 'HEALTHY'}
                </span>
              </div>
            </div>
            <div className="hidden sm:block w-px self-stretch" style={{ background: 'var(--border)' }} />
            <div className="hidden sm:block">
              <div className="text-[11px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Mode</div>
              <div className="text-sm font-medium mt-1.5" style={{ color: 'var(--text)' }}>{tel.source_type === 'SIMULATION' ? 'Simulation' : 'Hardware'}</div>
            </div>
          </div>
        </div>
      </div>

      <Quadcopter3DViewer />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Motors</h3>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{motorList.filter(m => m.connected).length}/4</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {motorList.map(m => (
            <div key={m.id} className="aerospace-card p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{m.name}</div>
                <span
                  className="text-[11px] px-2 py-1 rounded-full border"
                  style={{
                    background: m.connected ? (m.isRunning ? 'var(--text)' : 'var(--card)') : 'var(--card)',
                    color: m.connected ? (m.isRunning ? 'var(--bg)' : 'var(--text-muted)') : 'var(--text-faint)',
                    borderColor: m.connected ? (m.isRunning ? 'var(--text)' : 'var(--border)') : 'var(--border)',
                  }}
                >
                  {m.connected ? (m.isRunning ? 'Running' : 'Standby') : 'Offline'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>RPM</div>
                  <div className="text-sm font-medium tabular-nums mt-0.5" style={{ color: 'var(--text)' }}>{m.connected ? m.rpm.toFixed(0) : '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Thrust</div>
                  <div className="text-sm font-medium tabular-nums mt-0.5" style={{ color: 'var(--text)' }}>{m.connected && m.thrust ? `${m.thrust.toFixed(0)} g` : '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Current</div>
                  <div className="text-sm font-medium tabular-nums mt-0.5" style={{ color: 'var(--text)' }}>{m.connected ? `${m.current.toFixed(2)} A` : '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Temp</div>
                  <div className="text-sm font-medium tabular-nums mt-0.5" style={{ color: 'var(--text)' }}>{m.temp !== null && m.temp !== undefined ? `${Number(m.temp).toFixed(0)}°C` : '—'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="aerospace-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Telemetry</h3>
          <div className="flex items-center gap-2">
            <div className="flex p-1 rounded-full border gap-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              {(['rpm', 'current', 'temperature', 'power'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-3 py-1 rounded-full text-xs capitalize transition-colors"
                  style={activeTab === tab ? { background: 'var(--text)', color: 'var(--bg)' } : { color: 'var(--text-muted)' }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="hidden sm:flex rounded-full border p-1 gap-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              {(['5m', '10m', '20m'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r as any)}
                  className="px-2.5 py-1 rounded-full text-xs"
                  style={timeRange === r ? { background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' } : { color: 'var(--text-muted)' }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval="preserveStartEnd" minTickGap={40} />
              <YAxis stroke="var(--text-faint)" fontSize={11} width={44} tick={{ fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                cursor={{ stroke: 'var(--border)' }}
                labelStyle={{ color: 'var(--text-muted)', fontSize: 11 }}
              />
              <Area type="monotone" dataKey={activeTab} stroke={isDark ? '#fafafa' : '#0a0a0a'} strokeWidth={1.5} fill={isDark ? '#262626' : '#f5f5f5'} fillOpacity={1} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-[10px] mt-1 px-1" style={{ color: 'var(--text-faint)' }}>
            <span>{timeRange} window • {chartData.length} points</span>
            <span className="hidden sm:inline">Live {activeTab} • decimated to ≤400 pts</span>
          </div>
        </div>
      </div>
    </div>
  );
};
