import React, { useState, useMemo } from 'react';
import { Activity, Cpu, AlertTriangle, AlertOctagon, TrendingUp, HelpCircle, Radio } from 'lucide-react';
import { useAppStore } from '../state/store';
import { api } from '../services/api';
import { Quadcopter3DViewer } from '../three/Quadcopter3DViewer';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const OverviewPage: React.FC = () => {
  const { systemState, history, setHelpModalParam, activeAlerts, theme } = useAppStore();
  const [timeRange, setTimeRange] = useState<'5s' | '30s' | '1m' | '5m'>('30s');
  const [activeTelemetryTab, setActiveTelemetryTab] = useState<'rpm' | 'current' | 'temperature' | 'vibration' | 'power'>('rpm');

  const historySlice = useMemo(() => {
    const totalSamples = history.length;
    let count = 30;
    if (timeRange === '5s') count = 10;
    else if (timeRange === '30s') count = 30;
    else if (timeRange === '1m') count = 60;
    else if (timeRange === '5m') count = 60;
    return history.slice(-count);
  }, [history, timeRange]);

  if (!systemState) {
    return (
      <div className="flex flex-col items-center justify-center h-[420px] gap-4 animate-fadeInUp">
        <div className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <Activity className="w-5 h-5 animate-pulse-soft" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Connecting to Falconz stream…</p>
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Awaiting 10 Hz WebSocket • Minimal GCS</span>
        </div>
      </div>
    );
  }

  const tel = systemState.telemetry;
  const intel = systemState.intelligence;
  const motors = tel.motors || {};
  const isConnected = tel.connection_status === 'CONNECTED';
  const isHeartbeat = !!tel.heartbeat_received;
  const isStale = tel.connection_status === 'STALE' || (tel.telemetry_age_ms != null && tel.telemetry_age_ms > 3000);
  const criticalAlerts = activeAlerts.filter(a => a.level === 'CRITICAL');
  const hasCritical = criticalAlerts.length > 0;

  const chartData = historySlice.map((h, i) => ({
    time: i,
    rpm: h.telemetry?.rpm ?? 0,
    current: h.telemetry?.current_a ?? 0,
    temperature: h.telemetry?.temperature_c ?? 25,
    vibration: h.telemetry?.vibration_rms_g ?? 0.05,
    power: h.telemetry?.power_elec_w ?? 0,
  }));

  const getMotorData = (mKey: 'motor_1' | 'motor_2' | 'motor_3' | 'motor_4', idx: number) => {
    const m = motors[mKey];
    const isMotorConnected = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : false;
    const isConn = isConnected && isMotorConnected;
    let status: 'GREEN' | 'AMBER' | 'RED' | 'GRAY' | 'DISCONNECTED' = 'GRAY';
    if (!isMotorConnected) status = 'DISCONNECTED';
    else if (!isConn && tel.source_type !== 'SIMULATION') status = 'GRAY';
    else if (m?.temperature_c && m.temperature_c > 75) status = 'RED';
    else if (m?.temperature_c && m.temperature_c > 60) status = 'AMBER';
    else if (isConn) status = 'GREEN';
    const liveRpm = isMotorConnected ? (m?.live_rpm ?? 0) : 0;
    const liveCurr = isMotorConnected ? (m?.current_a ?? 0) : 0;
    const liveVolt = isMotorConnected ? ((m?.voltage_v && m.voltage_v > 1.0) ? m.voltage_v : (tel.voltage_v && tel.voltage_v > 1.0 ? tel.voltage_v : (tel.battery_voltage_v && tel.battery_voltage_v > 1.0 ? tel.battery_voltage_v : 11.1))) : 0;
    const liveTemp = isMotorConnected ? (m?.temperature_c ?? tel.temperature_c ?? 25) : null;
    const liveVib = isMotorConnected ? (m?.vibration_rms_g ?? tel.vibration_rms_g ?? 0) : 0;
    const liveThrottle = isMotorConnected ? (m?.throttle_pct ?? tel.throttle_pct ?? 0) : 0;
    const liveThrust = isMotorConnected ? (m?.thrust_g ?? 0) : 0;
    const livePower = isMotorConnected ? (m?.power_w ?? +(liveVolt * liveCurr).toFixed(1)) : 0;
    const liveGW = isMotorConnected ? (m?.g_per_watt ?? 0) : 0;
    return {
      id: mKey, name: `MOTOR ${idx + 1}`, channelLabel: `Channel ${idx + 1} (${idx === 0 ? 'Front-Right CW' : idx === 1 ? 'Rear-Left CW' : idx === 2 ? 'Front-Left CCW' : 'Rear-Right CCW'})`,
      status, isMotorConnected, liveRpm, liveCurr, liveVolt, liveTemp, liveVib, liveThrust, livePower, liveGW, liveThrottle,
      disconnectionReason: m?.disconnection_reason || 'Hardware cable unplugged',
      source: !isMotorConnected ? 'OFFLINE' : (isConn && (m?.status === 'REAL' || tel.source_type !== 'SIMULATION') ? `REAL • ${tel.source_type.replace('_', ' ')}` : tel.source_type === 'SIMULATION' ? 'SIMULATION' : 'UNAVAILABLE')
    };
  };
  const motorList = [getMotorData('motor_1', 0), getMotorData('motor_2', 1), getMotorData('motor_3', 2), getMotorData('motor_4', 3)];

  return (
    <div className="space-y-6">
      {/* Critical Banner */}
      {hasCritical && (
        <div className="animate-slideDown flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 rounded-xl border" style={{ background: 'var(--critical-bg)', borderColor: 'var(--critical-border)', color: 'var(--critical)' }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0"><AlertOctagon className="w-4.5 h-4.5" /></div>
            <div>
              <div className="flex items-center gap-2"><span className="text-xs font-bold tracking-[0.12em] uppercase">Critical Propulsion Alert</span><span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-600 text-white">HIGH RISK</span></div>
              <p className="text-[13px] font-medium leading-tight mt-1" style={{ color: 'var(--critical)' }}>{criticalAlerts[0].event} — {criticalAlerts[0].evidence}</p>
              <div className="text-[11px] font-semibold mt-2 px-2.5 py-1 rounded-lg border inline-flex" style={{ background: 'var(--card)', borderColor: 'var(--critical-border)' }}>→ {criticalAlerts[0].action}</div>
            </div>
          </div>
        </div>
      )}

      {/* Radio + Stale banners — minimal */}
      {tel.radio_rssi != null && tel.radio_rssi > 0 && isConnected && (
        <div className="animate-slideDown flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs" style={{ background: 'rgba(2,132,199,0.06)', borderColor: 'rgba(2,132,199,0.14)', color: 'var(--text)' }}>
          <div className="flex items-center gap-2"><Radio className="w-4 h-4" style={{ color: 'var(--accent)' }} /><span className="font-semibold" style={{ color: 'var(--accent)' }}>Telemetry Radio Active</span><span style={{ color: 'var(--text-muted)' }}>RSSI {tel.radio_rssi > 100 ? `${Math.round((tel.radio_rssi/1.9)-127)} dBm` : `${tel.radio_rssi} dBm`} • Noise {tel.radio_noise || 0} dBm</span></div>
          <span className="text-[11px] font-bold px-2 py-1 rounded-full border" style={{ background: tel.radio_remrssi && tel.radio_remrssi>0 ? 'var(--success-bg)' : 'var(--warning-bg)', color: tel.radio_remrssi && tel.radio_remrssi>0 ? 'var(--success)' : 'var(--warning)', borderColor: tel.radio_remrssi && tel.radio_remrssi>0 ? 'var(--success-border)' : 'var(--warning-border)' }}>{tel.radio_remrssi && tel.radio_remrssi>0 ? 'AIR LINK LOCKED' : 'AWAITING AIR LINK'}</span>
        </div>
      )}
      {isStale && !hasCritical && isConnected && (
        <div className="animate-slideDown flex items-center gap-2 px-4 py-3 rounded-xl border text-xs" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning-border)', color: 'var(--warning)' }}><AlertTriangle className="w-4 h-4" /> Telemetry stale — {((tel.telemetry_age_ms ?? 3000)/1000).toFixed(1)}s ago</div>
      )}

      {/* Health Hero — minimal professional */}
      <div className="aerospace-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2"><Activity className="w-4 h-4" style={{ color: 'var(--accent)' }} /><span className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--text-faint)' }}>Propulsion Status</span><button onClick={() => setHelpModalParam('health')} className="w-6 h-6 rounded-full border flex items-center justify-center hover:opacity-80" style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}><HelpCircle className="w-3 h-3" /></button></div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Multi-channel validation • Electro-thermal physics</p>
          </div>
          <div className="flex items-stretch gap-6">
            <div className="text-right">
              <div className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--text-faint)' }}>Health</div>
              <div className="flex items-baseline gap-2 justify-end mt-1">
                <span className="text-[30px] font-semibold tabular-nums leading-none tracking-tight" style={{ color: intel.health_band==='HEALTHY' ? 'var(--success)' : intel.health_band==='WARNING' ? 'var(--warning)' : 'var(--critical)' }}>{isConnected || tel.source_type==='SIMULATION' ? `${Math.round(intel.health_index ?? 100)}%` : '—'}</span>
                <span className="text-[11px] font-bold px-2 py-1 rounded-full border h-6 inline-flex items-center" style={{ background: intel.health_band==='HEALTHY' ? 'var(--success-bg)' : intel.health_band==='WARNING' ? 'var(--warning-bg)' : 'var(--critical-bg)', color: intel.health_band==='HEALTHY' ? 'var(--success)' : intel.health_band==='WARNING' ? 'var(--warning)' : 'var(--critical)', borderColor: intel.health_band==='HEALTHY' ? 'var(--success-border)' : intel.health_band==='WARNING' ? 'var(--warning-border)' : 'var(--critical-border)' }}>{isConnected || tel.source_type==='SIMULATION' ? (intel.health_band||'HEALTHY') : 'OFFLINE'}</span>
              </div>
            </div>
            <div className="w-px self-stretch" style={{ background: 'var(--border)' }} />
            <div>
              <div className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--text-faint)' }}>Trend</div>
              <div className="flex items-center gap-1.5 mt-1.5 text-sm font-semibold" style={{ color: 'var(--text)' }}><span>{intel.trend || 'STABLE'}</span>{intel.trend==='DEGRADING' ? <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} /> : <span style={{ color: 'var(--success)' }}>↗</span>}</div>
            </div>
            <div className="w-px self-stretch" style={{ background: 'var(--border)' }} />
            <div>
              <div className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--text-faint)' }}>Confidence</div>
              <div className="text-sm font-semibold mt-1.5" style={{ color: 'var(--text)' }}>{isConnected || tel.source_type==='SIMULATION' ? `${intel.confidence_pct || 94}%` : 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Viewer */}
      <div className="animate-fadeInUp"><Quadcopter3DViewer /></div>

      {/* Motor Channels — minimal grid */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--text)' }}>Motor Channels</span>
            <span className="text-[11px] font-bold px-2 py-1 rounded-full border h-6 inline-flex items-center" style={{ background: motorList.filter(m=>m.isMotorConnected).length>0 ? 'var(--success-bg)' : 'var(--critical-bg)', color: motorList.filter(m=>m.isMotorConnected).length>0 ? 'var(--success)' : 'var(--critical)', borderColor: motorList.filter(m=>m.isMotorConnected).length>0 ? 'var(--success-border)' : 'var(--critical-border)' }}>{motorList.filter(m=>m.isMotorConnected).length} / 4 CONNECTED</span>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full border hidden sm:inline-flex items-center gap-1.5" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}><span className={`w-1.5 h-1.5 rounded-full ${motorList.some(m=>m.isMotorConnected) ? 'bg-emerald-500 animate-pulse-soft' : 'bg-rose-500'}`} />{motorList.filter(m=>m.isMotorConnected).length===4 ? 'ALL CHANNELS ACTIVE' : `${motorList.filter(m=>m.isMotorConnected).length}/4 BENCH MODE`}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {motorList.map(m => {
            const isConn = m.isMotorConnected;
            const accent = !isConn ? 'var(--critical)' : m.status==='GREEN' ? 'var(--success)' : m.status==='AMBER' ? 'var(--warning)' : 'var(--critical)';
            return (
              <div key={m.id} className="aerospace-card p-5 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent, opacity: isConn?1:0.9 }} />
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: isConn ? 'var(--success)' : 'var(--critical)' }} /><span className="text-xs font-bold tracking-wide" style={{ color: 'var(--text)' }}>{m.name}</span></div>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-faint)' }}>{m.channelLabel}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full border h-6 inline-flex items-center shrink-0" style={{ background: !isConn ? 'var(--critical-bg)' : m.liveRpm>50 ? 'var(--success-bg)' : 'color-mix(in srgb, var(--bg) 80%, transparent)', color: !isConn ? 'var(--critical)' : m.liveRpm>50 ? 'var(--success)' : 'var(--text-muted)', borderColor: !isConn ? 'var(--critical-border)' : m.liveRpm>50 ? 'var(--success-border)' : 'var(--border)' }}>{!isConn ? 'OFFLINE' : m.status==='RED' ? 'CRITICAL' : m.status==='AMBER' ? 'WARNING' : m.liveRpm>50 ? `${m.liveRpm.toFixed(0)} RPM` : 'STANDBY'}</span>
                </div>

                {!isConn ? (
                  <div className="space-y-3">
                    <div className="px-3 py-2.5 rounded-xl border text-xs flex items-center gap-2" style={{ background: 'var(--critical-bg)', borderColor: 'var(--critical-border)', color: 'var(--critical)' }}><AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span className="font-medium">{m.disconnectionReason}</span></div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {['RPM','CURRENT','THRUST','VIB'].map(k=><div key={k} className="p-2.5 rounded-xl border text-center" style={{ background: 'color-mix(in srgb, var(--bg) 70%, transparent)', borderColor: 'var(--border)', color: 'var(--text-faint)' }}><div className="text-[10px] font-bold tracking-wide">{k}</div><div className="font-semibold" style={{ color: 'var(--text-faint)' }}>—</div></div>)}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl border" style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', borderColor: 'var(--border)' }}><div className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text-faint)' }}>RPM</div><div className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: 'var(--text)' }}>{m.liveRpm>0 ? m.liveRpm.toFixed(0) : '0'}</div></div>
                      <div className="p-3 rounded-xl border" style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', borderColor: 'var(--border)' }}><div className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text-faint)' }}>THRUST</div><div className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: 'var(--accent)' }}>{m.liveThrust>0 ? `${m.liveThrust.toFixed(0)}g` : '0g'}</div></div>
                      <div className="p-3 rounded-xl border" style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', borderColor: 'var(--border)' }}><div className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text-faint)' }}>CURRENT</div><div className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: 'var(--text)' }}>{m.liveCurr.toFixed(2)}A</div></div>
                      <div className="p-3 rounded-xl border" style={{ background: 'color-mix(in srgb, var(--bg) 60%, transparent)', borderColor: 'var(--border)' }}><div className="text-[10px] font-bold tracking-[0.08em] uppercase" style={{ color: 'var(--text-faint)' }}>TEMP</div><div className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: 'var(--text)' }}>{m.liveTemp!==null ? `${m.liveTemp.toFixed(0)}°C` : '—'}</div></div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      <span>THR <strong style={{ color: 'var(--text)' }}>{m.liveThrottle.toFixed(0)}%</strong> • {m.livePower.toFixed(1)}W</span>
                      <button onClick={async e=>{e.stopPropagation(); await api.setMotorConnection(m.id, !isConn);}} className="text-[10px] font-bold tracking-wide px-2 py-1 rounded-full border hover:opacity-80" style={{ background: isConn ? 'var(--card)' : 'var(--success)', color: isConn ? 'var(--text-muted)' : 'white', borderColor: isConn ? 'var(--border)' : 'var(--success)' }}>{isConn ? 'DISCONNECT' : 'CONNECT'}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Telemetry Chart — hairline minimal */}
      <div className="aerospace-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} /><span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--text)' }}>Live Telemetry</span></div>
          <div className="flex items-center gap-2">
            <div className="flex p-1 rounded-full border gap-0.5" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
              {(['rpm','current','temperature','vibration','power'] as const).map(tab=>(
                <button key={tab} onClick={()=>setActiveTelemetryTab(tab)} className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase transition-colors ${activeTelemetryTab===tab ? 'bg-sky-600 text-white shadow-sm' : 'hover:bg-white dark:hover:bg-slate-800'}`} style={activeTelemetryTab!==tab?{color:'var(--text-muted)'}:{}}>{tab}</button>
              ))}
            </div>
            <div className="hidden sm:flex p-0.5 rounded-full border gap-0.5" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
              {(['5s','30s','1m','5m'] as const).map(r=>(
                <button key={r} onClick={()=>setTimeRange(r)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${timeRange===r ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : ''}`} style={timeRange!==r?{color:'var(--text-muted)'}:{}}>{r}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeTelemetryTab==='temperature' ? '#d97706' : activeTelemetryTab==='vibration' ? '#7c3aed' : '#0284c7'} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={activeTelemetryTab==='temperature' ? '#d97706' : activeTelemetryTab==='vibration' ? '#7c3aed' : '#0284c7'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme==='dark' ? '#232a31' : '#e2e8f0'} strokeOpacity={0.8} />
              <XAxis dataKey="time" hide />
              <YAxis stroke={theme==='dark' ? '#475569' : '#94a3b8'} fontSize={11} tickFormatter={v=>typeof v==='number'? v.toFixed(1): String(v)} width={44} tick={{ fontFamily: 'JetBrains Mono' }} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'var(--text)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
              <Area type="monotone" dataKey={activeTelemetryTab} stroke={activeTelemetryTab==='temperature' ? '#d97706' : activeTelemetryTab==='vibration' ? '#7c3aed' : '#0284c7'} strokeWidth={1.5} fillOpacity={1} fill="url(#chartGrad)" dot={false} activeDot={{ r: 3, strokeWidth: 2 }} isAnimationActive={true} animationDuration={600} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
