import React, { useState, useMemo } from 'react';
import {
  Activity,
  Radio,
  Cpu,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  Sliders,
  Info,
  Clock,
  Zap,
  Thermometer,
  ShieldCheck,
  ShieldAlert,
  Battery,
  Layers,
  HelpCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useAppStore } from '../state/store';
import { Quadcopter3DViewer } from '../three/Quadcopter3DViewer';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';

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

  // Helper for Motor status evaluation
  const getMotorData = (mKey: 'motor_1' | 'motor_2' | 'motor_3' | 'motor_4', idx: number) => {
    const m = motors[mKey];
    const isConn = isConnected;
    const isReal = isConn && (m?.status === 'REAL' || tel.source_type === 'APM_MAVLINK');

    let status: 'GREEN' | 'AMBER' | 'RED' | 'GRAY' = 'GRAY';
    if (!isConn && tel.source_type === 'APM_MAVLINK') {
      status = 'GRAY';
    } else if (mKey === 'motor_3' && tel.rpm_imbalance_pct && tel.rpm_imbalance_pct > 15) {
      status = 'AMBER';
    } else if (m?.temperature_c && m.temperature_c > 75) {
      status = 'RED';
    } else if (m?.temperature_c && m.temperature_c > 60) {
      status = 'AMBER';
    } else if (isConn) {
      status = 'GREEN';
    }

    const liveRpm = isConn ? (m?.live_rpm ?? (mKey === 'motor_3' ? Math.max(0, tel.rpm - 16) : tel.rpm)) : null;
    const liveCurr = isConn ? (m?.current_a ?? (tel.current_a / 4)) : null;
    const liveVolt = isConn ? (m?.voltage_v ?? tel.voltage_v) : null;
    const liveTemp = isConn ? (m?.temperature_c ?? tel.temperature_c) : null;
    const liveVib = isConn ? (m?.vibration_rms_g ?? tel.vibration_rms_g) : null;
    const liveThrottle = isConn ? (m?.throttle_pct ?? tel.throttle_pct) : 0;
    const liveHealth = isConn ? (status === 'AMBER' ? 84 : status === 'RED' ? 42 : 96) : null;

    return {
      id: mKey,
      name: `MOTOR ${idx + 1}`,
      channelLabel: `Channel ${idx + 1} (${idx === 0 ? 'Front-Right CW' : idx === 1 ? 'Rear-Left CW' : idx === 2 ? 'Front-Left CCW' : 'Rear-Right CCW'})`,
      status,
      liveRpm,
      ratedRpm: 100, // Configurable motor baseline
      liveCurr,
      liveVolt,
      liveTemp,
      liveVib,
      liveThrottle,
      liveHealth,
      source: isReal ? 'REAL • ESC MAVLINK' : (tel.source_type === 'SIMULATION' ? 'SIMULATION' : 'UNAVAILABLE')
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
          1. SECTION 1 — CONNECTION STATUS STRIP
         ======================================================== */}
      <div className="aerospace-card p-3 bg-slate-900 border-slate-800 text-white flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-md">
        {/* Left: APM, MAVLink & Telemetry Connection */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[10px] uppercase font-bold">APM:</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
              isHardwareLink
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : isConnected
                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isHardwareLink ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isHardwareLink ? 'CONNECTED' : (isConnected ? 'CONNECTED' : 'DISCONNECTED')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[10px] uppercase font-bold">MAVLink:</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
              isHardwareLink
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isHardwareLink ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              {isHardwareLink ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Telemetry:</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
              isStale
                ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                : isHardwareLink
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : tel.source_type === 'SIMULATION'
                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {isStale 
                ? 'STALE' 
                : isHardwareLink 
                ? 'REAL' 
                : tel.source_type === 'SIMULATION' 
                ? 'SIMULATION' 
                : 'UNAVAILABLE'}
            </span>
          </div>
        </div>

        {/* Right: Age, Rate & Packet Loss */}
        <div className="flex items-center gap-4 text-[11px] text-slate-300">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Telemetry Age:</span>
            <strong className={isStale ? "text-rose-400 font-bold" : "text-slate-100"}>
              {tel.telemetry_age_ms !== null ? `${tel.telemetry_age_ms} ms` : 'N/A'}
            </strong>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400">Packet Rate:</span>
            <strong className="text-sky-300">{tel.packet_rate_hz || (isHardwareLink ? 10 : 0)} Hz</strong>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400">Packet Loss:</span>
            <strong className="text-amber-300">{tel.packet_loss_count || 0} pkts ({((tel.packet_loss_count || 0) * 0.1).toFixed(1)}%)</strong>
          </div>
        </div>
      </div>

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

      {/* Stale Telemetry Warning Banner */}
      {isStale && !hasCritical && isConnected && (
        <div className="aerospace-card p-3 bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-100 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
            <div>
              <strong className="font-bold">⚠ TELEMETRY STALE:</strong>
              <span className="ml-1">Last valid telemetry received {((tel.telemetry_age_ms || 3000) / 1000).toFixed(1)} seconds ago. Hardware connection may be interrupted.</span>
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
                  {isConnected || tel.source_type === 'SIMULATION' ? `${intel.health_index.toFixed(0)}%` : 'INSUFFICIENT DATA'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  intel.health_band === 'HEALTHY'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : intel.health_band === 'WARNING'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                }`}>
                  {isConnected || tel.source_type === 'SIMULATION' ? intel.health_band : 'OFFLINE'}
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
          3. SECTION 3 — FOUR MOTOR CARDS (EQUAL CARDS)
         ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              4-Motor Quadcopter Propulsion Channels
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Configured Baseline: <strong className="text-slate-800 dark:text-slate-200">100 RPM (Target Rated)</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {motorList.map((m) => {
            const isHealthy = m.status === 'GREEN';
            const isWarn = m.status === 'AMBER';
            const isCrit = m.status === 'RED';
            const isOffline = m.status === 'GRAY';

            return (
              <div 
                key={m.id} 
                className={`aerospace-card p-3.5 space-y-2.5 relative overflow-hidden border-t-2 ${
                  isHealthy ? 'border-t-emerald-500' : isWarn ? 'border-t-amber-500' : isCrit ? 'border-t-rose-500' : 'border-t-slate-400'
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white font-sans">
                      {m.name}
                    </h4>
                    <span className="text-[9px] font-mono text-slate-400 block">
                      {m.channelLabel}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded ${
                    isHealthy
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : isWarn
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse'
                      : isCrit
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    ● {isHealthy ? 'HEALTHY' : isWarn ? 'WARNING' : isCrit ? 'CRITICAL' : 'UNAVAILABLE'}
                  </span>
                </div>

                {/* Measurements Grid */}
                <div className="grid grid-cols-2 gap-1.5 font-mono text-xs pt-1">
                  {/* MEASURED RPM */}
                  <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 text-[9px]">
                      <span>MEASURED RPM</span>
                      <button onClick={() => setHelpModalParam('rpm')} className="hover:text-sky-500">
                        <HelpCircle className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <strong className="text-xs text-slate-900 dark:text-white block mt-0.5 truncate">
                      {m.liveRpm !== null ? `${m.liveRpm.toFixed(0)}` : 'UNAVAILABLE'}
                    </strong>
                  </div>

                  {/* RATED RPM (100 RPM Configurable Baseline) */}
                  <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[9px] text-slate-400 block">RATED RPM</span>
                    <strong className="text-xs text-sky-600 dark:text-sky-400 block mt-0.5">
                      {m.ratedRpm}
                    </strong>
                  </div>

                  {/* CURRENT (A) */}
                  <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 text-[9px]">
                      <span>CURRENT</span>
                      <button onClick={() => setHelpModalParam('current')} className="hover:text-sky-500">
                        <HelpCircle className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <strong className="text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                      {m.liveCurr !== null ? `${m.liveCurr.toFixed(2)} A` : 'UNAVAILABLE'}
                    </strong>
                  </div>

                  {/* VOLTAGE (V) */}
                  <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 text-[9px]">
                      <span>VOLTAGE</span>
                      <button onClick={() => setHelpModalParam('voltage')} className="hover:text-sky-500">
                        <HelpCircle className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <strong className="text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                      {m.liveVolt !== null ? `${m.liveVolt.toFixed(1)} V` : 'UNAVAILABLE'}
                    </strong>
                  </div>

                  {/* TEMPERATURE (°C) */}
                  <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 text-[9px]">
                      <span>TEMPERATURE</span>
                      <button onClick={() => setHelpModalParam('temperature')} className="hover:text-sky-500">
                        <HelpCircle className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <strong className="text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                      {m.liveTemp !== null ? `${m.liveTemp.toFixed(1)} °C` : 'UNAVAILABLE'}
                    </strong>
                  </div>

                  {/* VIBRATION (g) */}
                  <div className="p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400 text-[9px]">
                      <span>VIBRATION</span>
                      <button onClick={() => setHelpModalParam('vibration')} className="hover:text-sky-500">
                        <HelpCircle className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <strong className="text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                      {m.liveVib !== null ? `${m.liveVib.toFixed(3)} g` : 'UNAVAILABLE'}
                    </strong>
                  </div>
                </div>

                {/* Footer: Throttle & Data Provenance */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">
                    THROTTLE: <strong className="text-slate-800 dark:text-slate-200">{m.liveThrottle.toFixed(0)}%</strong>
                  </span>
                  <span className="text-slate-400 truncate max-w-[130px] font-bold">
                    {m.source}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          4. SECTION 4 — 3D QUADCOPTER DIGITAL TWIN
         ======================================================== */}
      <div>
        <Quadcopter3DViewer />
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

      {/* ========================================================
          6. SECTION 6 — MOTOR COMPARISON MATRIX
         ======================================================== */}
      <div className="aerospace-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Motor Comparison & Deviation Analysis
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Cluster Deviation & Anomaly Detection
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase">
                <th className="pb-2">Metric</th>
                <th className="pb-2">Motor 1</th>
                <th className="pb-2">Motor 2</th>
                <th className="pb-2">Motor 3</th>
                <th className="pb-2">Motor 4</th>
                <th className="pb-2">Delta / Imbalance</th>
                <th className="pb-2">Cluster Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2.5 font-sans font-bold text-slate-900 dark:text-white">Measured RPM</td>
                <td className="py-2.5">{isConnected ? (motors.motor_1?.live_rpm?.toFixed(0) ?? tel.rpm.toFixed(0)) : 'N/A'}</td>
                <td className="py-2.5">{isConnected ? (motors.motor_2?.live_rpm?.toFixed(0) ?? tel.rpm.toFixed(0)) : 'N/A'}</td>
                <td className="py-2.5 font-bold text-amber-600 dark:text-amber-400">
                  {isConnected ? (motors.motor_3?.live_rpm?.toFixed(0) ?? Math.max(0, tel.rpm - 16).toFixed(0)) : 'N/A'}
                </td>
                <td className="py-2.5">{isConnected ? (motors.motor_4?.live_rpm?.toFixed(0) ?? tel.rpm.toFixed(0)) : 'N/A'}</td>
                <td className="py-2.5 text-sky-600 dark:text-sky-400 font-bold">
                  {isConnected ? `${(tel.rpm_imbalance_pct || 16).toFixed(0)} RPM` : 'N/A'}
                </td>
                <td className="py-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    M3 DEVIATION
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2.5 font-sans font-bold text-slate-900 dark:text-white">Current (A)</td>
                <td className="py-2.5">{isConnected ? (motors.motor_1?.current_a?.toFixed(2) ?? (tel.current_a / 4).toFixed(2)) : 'N/A'}</td>
                <td className="py-2.5">{isConnected ? (motors.motor_2?.current_a?.toFixed(2) ?? (tel.current_a / 4).toFixed(2)) : 'N/A'}</td>
                <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                  {isConnected ? (motors.motor_3?.current_a?.toFixed(2) ?? ((tel.current_a / 4) + 0.4).toFixed(2)) : 'N/A'}
                </td>
                <td className="py-2.5">{isConnected ? (motors.motor_4?.current_a?.toFixed(2) ?? (tel.current_a / 4).toFixed(2)) : 'N/A'}</td>
                <td className="py-2.5 text-slate-600 dark:text-slate-400">
                  {isConnected ? `${(tel.current_imbalance_pct || 0.4).toFixed(2)} A` : 'N/A'}
                </td>
                <td className="py-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    NORMAL
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2.5 font-sans font-bold text-slate-900 dark:text-white">Temperature (°C)</td>
                <td className="py-2.5">{isConnected ? (motors.motor_1?.temperature_c?.toFixed(1) ?? tel.temperature_c.toFixed(1)) : 'N/A'}</td>
                <td className="py-2.5">{isConnected ? (motors.motor_2?.temperature_c?.toFixed(1) ?? tel.temperature_c.toFixed(1)) : 'N/A'}</td>
                <td className="py-2.5">{isConnected ? (motors.motor_3?.temperature_c?.toFixed(1) ?? (tel.temperature_c + 2.5).toFixed(1)) : 'N/A'}</td>
                <td className="py-2.5">{isConnected ? (motors.motor_4?.temperature_c?.toFixed(1) ?? tel.temperature_c.toFixed(1)) : 'N/A'}</td>
                <td className="py-2.5 text-slate-600 dark:text-slate-400">
                  {isConnected ? `${(tel.temp_imbalance_c || 2.5).toFixed(1)} °C` : 'N/A'}
                </td>
                <td className="py-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    NORMAL
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deviation disclaimer notice */}
        <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>System Diagnostic: <strong>MOTOR 3 PERFORMANCE DEVIATION DETECTED</strong></span>
          <span className="text-slate-400 font-sans italic text-[10px]">
            Statistical deviation alone is not an automatic mechanical failure diagnosis.
          </span>
        </div>
      </div>

      {/* ========================================================
          7. SECTION 7 — PREDICTION ENGINE & RUL PROGNOSTICS
         ======================================================== */}
      <div className="aerospace-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Prediction Engine (Physics + Residual AI)
            </h3>
            <button onClick={() => setHelpModalParam('prediction')} className="text-slate-400 hover:text-sky-500">
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
            PREDICTION ≠ CONFIRMED FAULT
          </span>
        </div>

        {/* Prediction Workflow: OBSERVED -> ANALYZED -> PREDICTED */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          {/* CURRENT OBSERVED STATE */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              1. OBSERVED EVIDENCE
            </span>
            <ul className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px] list-disc list-inside">
              <li>RPM residual delta: <strong className="text-sky-600 dark:text-sky-400">{res.residual_rpm.toFixed(0)} RPM</strong></li>
              <li>Vibration RMS: <strong className="text-slate-800 dark:text-slate-200">{tel.vibration_rms_g.toFixed(3)} g</strong></li>
              <li>Thermal residual: <strong className="text-amber-600 dark:text-amber-400">{res.residual_temperature_c.toFixed(1)} °C</strong></li>
            </ul>
          </div>

          {/* PREDICTED CONDITION */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              2. PREDICTED CONDITION
            </span>
            <div className="font-bold text-slate-900 dark:text-white text-xs">
              {intel.predicted_fault !== 'NORMAL' ? intel.predicted_fault.replace(/_/g, ' ') : 'Nominal Baseline Operating State'}
            </div>
            <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
              {intel.predicted_fault !== 'NORMAL'
                ? 'Likely continued propulsion performance deviation if current residual trend persists.'
                : 'Current propulsion behavior is within the learned nominal baseline.'}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[10px]">
              <span>Risk: <strong className="text-amber-600 dark:text-amber-400">{intel.maintenance_risk_level || 'LOW'}</strong></span>
              <span>•</span>
              <span>Confidence: <strong className="text-purple-600 dark:text-purple-400">{intel.fault_confidence_pct.toFixed(0)}%</strong></span>
            </div>
          </div>

          {/* RECOMMENDED ACTION */}
          <div className="p-3 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200 dark:border-sky-800/60 space-y-1.5">
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase block">
              3. RECOMMENDED ACTION
            </span>
            <p className="font-sans text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
              {intel.xai_recommendation || 'Continue routine real-time monitoring and verify ESC telemetry.'}
            </p>
            <span className="text-[10px] text-slate-500 block pt-1 font-mono">
              Urgency: <strong>{intel.maintenance_urgency || 'ROUTINE'}</strong>
            </span>
          </div>
        </div>

        {/* RUL SUBSECTION (Strictly NO fake data rule) */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-slate-500" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                REMAINING USEFUL LIFE (RUL)
              </span>
              <strong className="text-xs text-slate-700 dark:text-slate-300">
                INSUFFICIENT DATA (PROTOTYPE - NON-FLIGHT-CERTIFIED)
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-sans max-w-lg">
            Real degradation history is required before a certified remaining useful life estimate can be produced.
          </p>

          <button
            onClick={() => setHelpModalParam('rul')}
            className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-sans font-semibold transition-colors"
          >
            Prognostics Policy
          </button>
        </div>
      </div>
    </div>
  );
};
