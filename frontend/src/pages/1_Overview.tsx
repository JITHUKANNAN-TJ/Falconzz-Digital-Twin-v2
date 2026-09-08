import React, { useState, useMemo } from 'react';
import {
  Activity,
  Cpu,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  HelpCircle,
  Radio
} from 'lucide-react';
import { useAppStore } from '../state/store';
import { api } from '../services/api';
import { Quadcopter3DViewer } from '../three/Quadcopter3DViewer';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const OverviewPage: React.FC = () => {
  const { systemState, history, setHelpModalParam, activeAlerts, theme } = useAppStore();
  const [timeRange, setTimeRange] = useState<'5s' | '30s' | '1m' | '5m'>('30s');
  const [activeTelemetryTab, setActiveTelemetryTab] = useState<'rpm' | 'current' | 'temperature' | 'vibration' | 'power'>('rpm');

  // Filter history based on selected time window (called before early return to obey React hook rules)
  const historySlice = useMemo(() => {
    const totalSamples = history.length;
    let count = 30;
    if (timeRange === '5s') count = 10;
    else if (timeRange === '30s') count = 30;
    else if (timeRange === '1m') count = 60;
    else if (timeRange === '5m') count = 60; // Max stored buffer
    return history.slice(-count);
  }, [history, timeRange]);

  if (!systemState) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-slate-400 font-mono text-xs space-y-3">
        <Activity className="w-8 h-8 animate-spin text-sky-600" />
        <p className="font-bold">CONNECTING TO FALCONZ REAL-TIME TELEMETRY STREAM...</p>
        <span className="text-[11px] text-slate-500">Awaiting 10 Hz WebSocket Broadcast</span>
      </div>
    );
  }

  const tel = systemState.telemetry;
  const dt = systemState.digital_twin;
  const res = systemState.residuals;
  const intel = systemState.intelligence;
  const motors = tel.motors || {};

  const isConnected = tel.connection_status === 'CONNECTED';
  const isHeartbeat = !!tel.heartbeat_received;
  const isHardwareLink = isConnected && isHeartbeat;
  const isStale = tel.connection_status === 'STALE' || (tel.telemetry_age_ms != null && tel.telemetry_age_ms > 3000);

  // Critical Safety Alerts check
  const criticalAlerts = activeAlerts.filter(a => a.level === 'CRITICAL');
  const hasCritical = criticalAlerts.length > 0;

  const chartData = historySlice.map((h, i) => ({
    time: i,
    rpm: h.telemetry?.rpm ?? 0,
    expectedRpm: h.digital_twin?.expected_rpm ?? 0,
    current: h.telemetry?.current_a ?? 0,
    expectedCurrent: h.digital_twin?.expected_current_a ?? 0,
    temperature: h.telemetry?.temperature_c ?? 25,
    expectedTemp: h.digital_twin?.expected_temperature_c ?? 25,
    vibration: h.telemetry?.vibration_rms_g ?? 0.05,
    expectedVib: h.digital_twin?.expected_vibration_rms_g ?? 0.05,
    power: h.telemetry?.power_elec_w ?? 0,
    health: h.intelligence?.health_index ?? 100
  }));

  // Helper for Motor status evaluation strictly from telemetry
  const getMotorData = (mKey: 'motor_1' | 'motor_2' | 'motor_3' | 'motor_4', idx: number) => {
    const m = motors[mKey];
    const isMotorConnected = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : false;
    const isConn = isConnected && isMotorConnected;
    const isReal = isConn && (m?.status === 'REAL' || tel.source_type !== 'SIMULATION');

    let status: 'GREEN' | 'AMBER' | 'RED' | 'GRAY' | 'DISCONNECTED' = 'GRAY';
    if (!isMotorConnected) {
      status = 'DISCONNECTED';
    } else if (!isConn && tel.source_type !== 'SIMULATION') {
      status = 'GRAY';
    } else if (m?.temperature_c && m.temperature_c > 75) {
      status = 'RED';
    } else if (m?.temperature_c && m.temperature_c > 60) {
      status = 'AMBER';
    } else if (isConn) {
      status = 'GREEN';
    }

    // Strictly read real telemetry metrics for each motor — zero out when disconnected
    const liveRpm = isMotorConnected ? (m?.live_rpm ?? 0) : 0;
    const liveCurr = isMotorConnected ? (m?.current_a ?? 0) : 0;
    const liveVolt = isMotorConnected ? ((m?.voltage_v && m.voltage_v > 1.0) ? m.voltage_v : (tel.voltage_v && tel.voltage_v > 1.0 ? tel.voltage_v : (tel.battery_voltage_v && tel.battery_voltage_v > 1.0 ? tel.battery_voltage_v : 11.1))) : 0;
    const liveTemp = isMotorConnected ? (m?.temperature_c ?? tel.temperature_c ?? 25) : null;
    const liveVib = isMotorConnected ? (m?.vibration_rms_g ?? tel.vibration_rms_g ?? 0) : 0;
    const liveThrottle = isMotorConnected ? (m?.throttle_pct ?? tel.throttle_pct ?? 0) : 0;
    const liveThrust = isMotorConnected ? (m?.thrust_g ?? 0) : 0;
    const livePower = isMotorConnected ? (m?.power_w ?? +(liveVolt * liveCurr).toFixed(1)) : 0;
    const liveGW = isMotorConnected ? (m?.g_per_watt ?? 0) : 0;
    const liveEff = isMotorConnected ? (m?.efficiency_pct ?? 0) : 0;
    const liveHealth = isMotorConnected ? (status === 'AMBER' ? 84 : status === 'RED' ? 42 : 96) : null;

    return {
      id: mKey,
      name: `MOTOR ${idx + 1}`,
      channelLabel: `Channel ${idx + 1} (${idx === 0 ? 'Front-Right CW' : idx === 1 ? 'Rear-Left CW' : idx === 2 ? 'Front-Left CCW' : 'Rear-Right CCW'})`,
      status,
      isMotorConnected,
      liveRpm,
      liveCurr,
      liveVolt,
      liveTemp,
      liveVib,
      liveThrust,
      livePower,
      liveGW,
      liveEff,
      liveThrottle,
      liveHealth,
      disconnectionReason: m?.disconnection_reason || 'Hardware Cable Unplugged / No Telemetry Signal',
      source: !isMotorConnected ? 'OFFLINE' : (isReal ? (tel.source_type === 'APM_MAVLINK' ? 'REAL • ESC MAVLINK' : `REAL • ${tel.source_type.replace('_', ' ')}`) : (tel.source_type === 'SIMULATION' ? 'SIMULATION' : 'UNAVAILABLE'))
    };
  };

  const motorList = [
    getMotorData('motor_1', 0),
    getMotorData('motor_2', 1),
    getMotorData('motor_3', 2),
    getMotorData('motor_4', 3),
  ];

  return (
    <div className="space-y-4 select-none">


      {/* ========================================================
          CRITICAL DANGER ALERT BANNER (If genuine limit exceeded)
         ======================================================== */}
      {hasCritical && (
        <div className="aerospace-card p-4 bg-rose-600/15 border-rose-500 text-rose-900 dark:text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide text-rose-700 dark:text-rose-300 font-sans">
                  🚨 CRITICAL PROPULSION ALERT
                </h3>
                <span className="px-2 py-0.2 bg-rose-600 text-white rounded text-[10px] font-mono font-bold">
                  HIGH RISK
                </span>
              </div>
              <p className="text-xs font-mono text-rose-800 dark:text-rose-200 mt-1">
                {criticalAlerts[0].event} — {criticalAlerts[0].evidence}
              </p>
              <div className="text-xs font-mono font-bold text-rose-900 dark:text-rose-100 mt-1 bg-white/60 dark:bg-rose-950/60 px-2.5 py-1 rounded border border-rose-300 dark:border-rose-800 inline-block">
                RECOMMENDED ACTION: {criticalAlerts[0].action}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Telemetry Radio Link Active Banner */}
      {tel.radio_rssi != null && tel.radio_rssi > 0 && isConnected && (
        <div className="aerospace-card p-3 bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-100 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-sky-500 animate-pulse shrink-0" />
            <div>
              <strong className="font-bold text-sky-600 dark:text-sky-400">📡 3DR / SiK TELEMETRY RADIO ACTIVE:</strong>
              <span className="ml-1.5 text-slate-700 dark:text-slate-200">
                Ground RSSI: <strong>{tel.radio_rssi > 100 ? `${Math.round((tel.radio_rssi / 1.9) - 127)} dBm (${Math.min(100, Math.round((tel.radio_rssi / 255) * 100))}%)` : `${tel.radio_rssi} dBm`}</strong> | Noise: <strong>{tel.radio_noise || 0} dBm</strong> | Tx Buffer: <strong>{tel.radio_txbuf || 100}%</strong>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
              tel.radio_remrssi && tel.radio_remrssi > 0 
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            }`}>
              {tel.radio_remrssi && tel.radio_remrssi > 0 
                ? `AIR LINK LOCKED (${tel.radio_remrssi > 100 ? `${Math.round((tel.radio_remrssi / 1.9) - 127)} dBm` : `${tel.radio_remrssi}%`})` 
                : 'AWAITING AIR LINK (CONNECT DRONE BATTERY)'}
            </span>
          </div>
        </div>
      )}

      {/* Stale Telemetry Warning Banner */}
      {isStale && !hasCritical && isConnected && (!tel.radio_rssi || (tel.radio_remrssi != null && tel.radio_remrssi > 0)) && (
        <div className="aerospace-card p-3 bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-100 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
            <div>
              <strong className="font-bold">⚠ TELEMETRY STALE:</strong>
              <span className="ml-1">Last valid telemetry received {(((tel.telemetry_age_ms ?? 3000)) / 1000).toFixed(1)} seconds ago. Hardware connection may be interrupted.</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold shrink-0 text-[10px]">
            LINK DEGRADED
          </span>
        </div>
      )}

      {/* ========================================================
          2. SECTION 2 — LIVE QUADCOPTER STATE & OVERALL HEALTH
         ======================================================== */}
      <div className="aerospace-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                Real-Time Propulsion Status
              </h2>
              <button 
                onClick={() => setHelpModalParam('health')} 
                className="text-slate-400 hover:text-sky-500 transition-colors"
                title="Explain Propulsion Health"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
              Multi-channel physical telemetry validation and electro-thermal physics evaluation
            </p>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            {/* Overall Propulsion Health */}
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">
                PROPULSION HEALTH
              </span>
              <div className="flex items-baseline gap-1.5 justify-end">
                <span className={`text-xl font-black font-mono ${
                  intel.health_band === 'HEALTHY' 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : intel.health_band === 'WARNING'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {isConnected || tel.source_type === 'SIMULATION' ? `${(intel.health_index ?? 100).toFixed(0)}%` : 'INSUFFICIENT DATA'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  intel.health_band === 'HEALTHY'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : intel.health_band === 'WARNING'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                }`}>
                  {isConnected || tel.source_type === 'SIMULATION' ? (intel.health_band || 'HEALTHY') : 'OFFLINE'}
                </span>
              </div>
            </div>

            {/* Health Trend */}
            <div className="border-l border-slate-200 dark:border-slate-800 pl-4 text-left">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">
                TREND
              </span>
              <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                <span>{intel.trend || 'STABLE'}</span>
                {intel.trend === 'DEGRADING' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500 rotate-45" />
                ) : (
                  <span className="text-emerald-500">↑</span>
                )}
              </div>
            </div>

            {/* Confidence */}
            <div className="border-l border-slate-200 dark:border-slate-800 pl-4 text-left">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">
                CONFIDENCE
              </span>
              <strong className="text-slate-800 dark:text-slate-200">
                {isConnected || tel.source_type === 'SIMULATION' ? `${intel.confidence_pct || 94}%` : 'N/A'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. SECTION 3 — 3D QUADCOPTER DIGITAL TWIN
         ======================================================== */}
      <div>
        <Quadcopter3DViewer />
      </div>

      {/* ========================================================
          4. SECTION 4 — FOUR MOTOR CARDS (QUADCOPTER MOTOR PROPULSION CHANNELS)
         ======================================================== */}
      <div>
        <div className="flex flex-wrap items-center justify-between mb-2.5 gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Quadcopter Motor Propulsion Channels
            </h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              motorList.filter(m => m.isMotorConnected).length > 0 
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
            }`}>
              {motorList.filter(m => m.isMotorConnected).length} / 4 CONNECTED {motorList.filter(m => m.isMotorConnected).length < 4 ? '(BENCH RIG MODE)' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-slate-400 hidden sm:inline">BENCH RIG:</span>
            <span className={`px-2.5 py-1 rounded font-bold border flex items-center gap-1.5 ${
              motorList.filter(m => m.isMotorConnected).length === 4
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : motorList.filter(m => m.isMotorConnected).length > 0
                ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${motorList.some(m => m.isMotorConnected) ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {motorList.filter(m => m.isMotorConnected).length === 4 
                ? 'ALL 4 HARDWARE CHANNELS ACTIVE' 
                : motorList.filter(m => m.isMotorConnected).length > 0
                ? `${motorList.filter(m => m.isMotorConnected).length} / 4 MOTORS CONNECTED (BENCH RIG MODE)`
                : 'NO CHANNELS DETECTED'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {motorList.map((m) => {
            const isConn = m.isMotorConnected;
            const isHealthy = isConn && m.status === 'GREEN';
            const isWarn = isConn && m.status === 'AMBER';
            const isCrit = isConn && m.status === 'RED';

            return (
              <div 
                key={m.id} 
                className={`aerospace-card p-3.5 space-y-2.5 relative overflow-hidden border-t-2 transition-all ${
                  !isConn
                    ? 'border-t-rose-500 bg-rose-50/20 dark:bg-rose-950/10'
                    : isHealthy
                    ? 'border-t-emerald-500'
                    : isWarn
                    ? 'border-t-amber-500'
                    : isCrit
                    ? 'border-t-rose-500'
                    : 'border-t-slate-400'
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white font-sans flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isConn ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {m.name}
                    </h4>
                    <span className="text-[9px] font-mono text-slate-400 block">
                      {m.channelLabel}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded ${
                      !isConn
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : isCrit
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 animate-pulse'
                        : isWarn
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse'
                        : m.liveRpm > 50
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                    }`}>
                      {!isConn 
                        ? '✕ NOT CONNECTED' 
                        : isCrit 
                        ? '● CRITICAL' 
                        : isWarn 
                        ? '● WARNING' 
                        : m.liveRpm > 50 
                        ? `● RUNNING (${m.liveRpm.toFixed(0)} RPM)` 
                        : '○ STANDBY (0 RPM) • READY'}
                    </span>

                    {/* Quick Bench Rig Toggle */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await api.setMotorConnection(m.id, !isConn);
                      }}
                      className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        isConn
                          ? 'bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-600 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                      title={isConn ? `Click to mark ${m.name} as physically disconnected on bench rig` : `Click to connect ${m.name} on bench rig`}
                    >
                      {isConn ? 'BENCH: DISCONNECT' : 'BENCH: CONNECT'}
                    </button>
                  </div>
                </div>

                {!isConn ? (
                  /* Disconnected Motor State — Zeroed Physical Readings */
                  <div className="space-y-2 font-mono text-xs pt-1">
                    <div className="p-2 bg-rose-50/80 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/60 text-[10px] text-rose-800 dark:text-rose-300">
                      <strong className="flex items-center gap-1 font-bold text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> MOTOR DISCONNECTED
                      </strong>
                      <p className="text-[9px] text-rose-600 dark:text-rose-400 mt-0.5">{m.disconnectionReason}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="p-1.5 bg-slate-100/70 dark:bg-slate-950/60 rounded border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block text-[9px]">MEASURED RPM</span>
                        <strong className="text-slate-400">0 RPM</strong>
                      </div>
                      <div className="p-1.5 bg-slate-100/70 dark:bg-slate-950/60 rounded border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block text-[9px]">CURRENT</span>
                        <strong className="text-slate-400">0.00 A</strong>
                      </div>
                      <div className="p-1.5 bg-slate-100/70 dark:bg-slate-950/60 rounded border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block text-[9px]">DELIVERED THRUST</span>
                        <strong className="text-slate-400">0 g</strong>
                      </div>
                      <div className="p-1.5 bg-slate-100/70 dark:bg-slate-950/60 rounded border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block text-[9px]">VIBRATION RMS</span>
                        <strong className="text-slate-400">0.000 g</strong>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded border border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 text-center font-mono flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400/60 animate-ping" />
                      Awaiting physical cable connection / telemetry signal...
                    </div>
                  </div>
                ) : (
                  /* Connected Measurements Grid — Real Telemetry Values */
                  <div className="space-y-2 font-mono text-xs pt-1">
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* MEASURED RPM */}
                      <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                        <span className="text-slate-400 text-[9px] block">MEASURED RPM</span>
                        <strong className="text-xs text-slate-900 dark:text-white block mt-0.5 truncate">
                          {m.liveRpm > 0 ? `${m.liveRpm.toFixed(0)} RPM` : '0 RPM (STANDBY)'}
                        </strong>
                      </div>

                      {/* THRUST (g) */}
                      <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                        <span className="text-[9px] text-slate-400 block">THRUST</span>
                        <strong className="text-xs text-sky-600 dark:text-sky-400 block mt-0.5">
                          {m.liveThrust > 0 ? `${m.liveThrust.toFixed(0)} g` : '0 g'}
                        </strong>
                      </div>

                      {/* CURRENT (A) */}
                      <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                        <span className="text-slate-400 text-[9px] block">CURRENT</span>
                        <strong className="text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                          {m.liveCurr.toFixed(2)} A
                        </strong>
                      </div>

                      {/* VOLTAGE (V) */}
                      <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                        <span className="text-slate-400 text-[9px] block">VOLTAGE</span>
                        <strong className="text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                          {m.liveVolt.toFixed(1)} V
                        </strong>
                      </div>

                      {/* POWER (W) */}
                      <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                        <span className="text-slate-400 text-[9px] block">POWER</span>
                        <strong className="text-xs text-amber-600 dark:text-amber-400 block mt-0.5">
                          {m.livePower.toFixed(1)} W
                        </strong>
                      </div>

                      {/* TEMPERATURE (°C) */}
                      <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                        <span className="text-slate-400 text-[9px] block">TEMP</span>
                        <strong className="text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                          {m.liveTemp !== null ? `${m.liveTemp.toFixed(1)} °C` : '—'}
                        </strong>
                      </div>

                      {/* VIBRATION RMS */}
                      <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                        <span className="text-slate-400 text-[9px] block">VIB RMS</span>
                        <strong className="text-xs text-purple-600 dark:text-purple-400 block mt-0.5">
                          {m.liveVib.toFixed(3)} g
                        </strong>
                      </div>

                      {/* THRUST EFFICIENCY (g/W) */}
                      <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                        <span className="text-[9px] text-slate-400 block">EFFICIENCY</span>
                        <strong className="text-xs text-emerald-600 dark:text-emerald-400 block mt-0.5">
                          {m.liveGW > 0 ? `${m.liveGW.toFixed(2)} g/W` : (m.liveEff > 0 ? `${m.liveEff.toFixed(1)}%` : '—')}
                        </strong>
                      </div>
                    </div>

                    {/* Footer: Live Hardware Channel Status */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">
                        THROTTLE: <strong className="text-slate-800 dark:text-slate-200">{m.liveThrottle.toFixed(0)}%</strong>
                      </span>
                      <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                        m.liveRpm > 50
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}>
                        {m.liveRpm > 50 ? `${m.liveRpm.toFixed(0)} RPM LIVE` : 'STANDBY (0 RPM) • READY'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          5. SECTION 5 — KEY REAL-TIME TELEMETRY CHARTS
         ======================================================== */}
      <div className="aerospace-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Live Telemetry Stream
            </h3>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-mono">
            {(['rpm', 'current', 'temperature', 'vibration', 'power'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTelemetryTab(tab)}
                className={`px-2.5 py-1 rounded font-semibold uppercase transition-colors ${
                  activeTelemetryTab === tab
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Time Window Selector (5s, 30s, 1m, 5m) */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-[11px] font-mono">
            {(['5s', '30s', '1m', '5m'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-0.5 rounded font-bold transition-colors ${
                  timeRange === range
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Rendering Area */}
        <div className="h-48 w-full font-mono text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeTelemetryTab === 'temperature' ? '#f59e0b' : activeTelemetryTab === 'vibration' ? '#8b5cf6' : '#0284c7'} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={activeTelemetryTab === 'temperature' ? '#f59e0b' : activeTelemetryTab === 'vibration' ? '#8b5cf6' : '#0284c7'} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
              <XAxis dataKey="time" hide />
              <YAxis stroke="#94a3b8" fontSize={10} fontStyle="monospace" domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                  borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: theme === 'dark' ? '#ffffff' : '#0f172a'
                }}
              />
              <Area 
                type="monotone" 
                dataKey={activeTelemetryTab} 
                stroke={activeTelemetryTab === 'temperature' ? '#f59e0b' : activeTelemetryTab === 'vibration' ? '#8b5cf6' : '#0284c7'} 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#chartGrad)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
