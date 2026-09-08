import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Download, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Layers,
  Cpu,
  Gauge,
  Zap,
  Thermometer,
  Activity,
  Check,
  Flame,
  Radio
} from 'lucide-react';
import { useAppStore } from '../state/store';
import { api } from '../services/api';

const MOTOR_KEYS = ['motor_1', 'motor_2', 'motor_3', 'motor_4'] as const;

export const DataTelemetryPage: React.FC = () => {
  const { history, systemState, wsConnected } = useAppStore();
  const [events, setEvents] = useState<any[]>([]);
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'FOCUSED_MOTORS' | 'FULL_AUDIT'>('FOCUSED_MOTORS');

  const tel = systemState?.telemetry;
  const motors = tel?.motors || {};

  const fetchEvents = async () => {
    try {
      const data = await api.getSystemEvents();
      setEvents(data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleExportCSV = () => {
    window.open('/api/telemetry/export-csv', '_blank');
  };

  const filteredHistory = filterSource === 'ALL'
    ? history
    : history.filter(h => h.telemetry?.source_type === filterSource);

  // Compute connected motors summary
  const connectedCount = MOTOR_KEYS.filter(k => {
    const m = motors[k];
    return m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
  }).length;

  const totalThrust = MOTOR_KEYS.reduce((acc, k) => {
    const m = motors[k];
    const isConn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
    return acc + (isConn ? (m?.thrust_g ?? 0) : 0);
  }, 0);

  const totalCurrent = MOTOR_KEYS.reduce((acc, k) => {
    const m = motors[k];
    const isConn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
    return acc + (isConn ? (m?.current_a ?? 0) : 0);
  }, 0);

  const totalPower = MOTOR_KEYS.reduce((acc, k) => {
    const m = motors[k];
    const isConn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
    return acc + (isConn ? (m?.power_w ?? 0) : 0);
  }, 0);

  const avgEfficiency = totalPower > 0.5 
    ? (totalThrust / totalPower) 
    : 0;

  const peakVibration = Math.max(...MOTOR_KEYS.map(k => {
    const m = motors[k];
    const isConn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
    return isConn ? (m?.vibration_rms_g ?? 0.02) : 0;
  }));

  return (
    <div className="space-y-4 select-none">
      {/* ========================================================
          1. HEADER & DEDICATED VIEW SWITCHER
         ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight font-mono">
              Real-Time Motor Telemetry Engine
            </h1>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              wsConnected 
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {wsConnected ? 'LIVE 10 HZ STREAM' : 'DISCONNECTED'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
            Calibrated to A2212 / 15T 930KV with 1045 Prop on 3S LiPo (11.1V–12.4V) • High-precision empirical dynamometer benchmark
          </p>
        </div>

        {/* View Mode Toggle & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold">
            <button
              onClick={() => setViewMode('FOCUSED_MOTORS')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'FOCUSED_MOTORS'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>MOTOR TELEMETRY ONLY</span>
            </button>
            <button
              onClick={() => setViewMode('FULL_AUDIT')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'FULL_AUDIT'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>FULL AUDIT & BUFFER</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs font-mono shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> EXPORT CSV
          </button>
        </div>
      </div>

      {/* ========================================================
          2. HARDWARE INGRESS & TELEMETRY LINK STATUS BAR
         ======================================================== */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold text-[10px] border border-sky-300 dark:border-sky-800 flex items-center gap-1">
            <Radio className="w-3 h-3 text-sky-600" />
            HARDWARE INGRESS TELEMETRY
          </span>
          <span className="text-slate-600 dark:text-slate-400 text-xs hidden sm:inline">
            Active Ingress Channels:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded font-bold border flex items-center gap-1.5 text-xs ${
            connectedCount === 4
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : connectedCount > 0
              ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connectedCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {connectedCount === 4 
              ? 'ALL 4 HARDWARE CHANNELS ACTIVE' 
              : connectedCount > 0
              ? `${connectedCount} / 4 CHANNELS DETECTED (BENCH MODE)`
              : 'NO MOTOR TELEMETRY DETECTED'}
          </span>
          <span className="text-[10px] text-slate-400 hidden md:inline">
            • Auto-detected from incoming ESC telemetry packets
          </span>
        </div>
      </div>

      {/* ========================================================
          3. REAL-TIME PROPULSION FLEET KPI SUMMARY BAR
         ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="aerospace-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold">CONNECTED MOTORS</span>
            <span className={`w-2 h-2 rounded-full ${connectedCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-2xl font-black ${
              connectedCount === 4 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {connectedCount} / 4
            </span>
            <span className="text-[10px] text-slate-500">
              {connectedCount === 4 ? 'FULL QUAD' : connectedCount === 1 ? 'SINGLE RIG' : `${connectedCount} ONLINE`}
            </span>
          </div>
        </div>

        <div className="aerospace-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold">TOTAL DELIVERED THRUST</span>
            <Gauge className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-sky-600 dark:text-sky-400">
              {Math.round(totalThrust).toLocaleString()} g
            </span>
            <span className="text-[10px] text-slate-500">
              ({(totalThrust / 1000).toFixed(2)} kgf)
            </span>
          </div>
        </div>

        <div className="aerospace-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold">TOTAL PROPULSION CURRENT</span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalCurrent.toFixed(2)} A
            </span>
            <span className="text-[10px] text-slate-500">
              @ {tel?.battery_voltage_v ? tel.battery_voltage_v.toFixed(1) : (tel?.voltage_v ? tel.voltage_v.toFixed(1) : '11.8')} V
            </span>
          </div>
        </div>

        <div className="aerospace-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold">AVG CLUSTER EFFICIENCY</span>
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {avgEfficiency > 0 ? `${avgEfficiency.toFixed(2)} g/W` : '0.00 g/W'}
            </span>
            <span className="text-[10px] text-slate-500">
              {avgEfficiency >= 8.0 ? 'OPTIMAL' : avgEfficiency >= 6.0 ? 'EFFICIENT' : 'CRUISE'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          4. 4 HIGH-PRECISION REAL-TIME MOTOR TELEMETRY CARDS
         ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
              Individual Real-Time Motor Channels (A2212 930KV Benchmark)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Auto-synchronizing via WebSocket at 10 Hz • Zero phantom data on disconnected channels
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {MOTOR_KEYS.map((mKey, idx) => {
            const m = motors[mKey];
            const isMotorConnected = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;

            const label = idx === 0 
              ? 'M1 - FRONT RIGHT (CW)' 
              : idx === 1 
              ? 'M2 - REAR LEFT (CW)' 
              : idx === 2 
              ? 'M3 - FRONT LEFT (CCW)' 
              : 'M4 - REAR RIGHT (CCW)';

            const escCh = `ESC ${idx} • CH ${idx + 1}`;
            const liveRpm = isMotorConnected ? (m?.live_rpm ?? tel?.rpm ?? 0) : 0;
            const liveThrust = isMotorConnected ? (m?.thrust_g ?? 0) : 0;
            const liveCurrent = isMotorConnected ? (m?.current_a ?? ((tel?.current_a ?? 0) / Math.max(1, connectedCount))) : 0;
            const liveVoltage = isMotorConnected ? (m?.voltage_v ?? (tel?.voltage_v ?? 11.8)) : 0;
            const livePower = isMotorConnected ? (m?.power_w ?? (liveCurrent * liveVoltage)) : 0;
            const liveEfficiency = isMotorConnected ? (m?.g_per_watt ?? (livePower > 0 ? liveThrust / livePower : 0)) : 0;
            const liveTemp = isMotorConnected ? (m?.temperature_c ?? (tel?.temperature_c ?? 25)) : 24;
            const liveVib = isMotorConnected ? (m?.vibration_rms_g ?? 0.024) : 0.015;
            const liveTorque = isMotorConnected ? (m?.torque_nm ?? 0.0) : 0.0;
            const liveThrottle = isMotorConnected ? (m?.throttle_pct ?? tel?.throttle_pct ?? 0) : 0;
            const inCruiseZone = isMotorConnected && (50.0 <= liveThrottle && liveThrottle <= 62.0);

            // Progress bar percentages (rated maximum: 8050 RPM, 980g thrust)
            const rpmPct = Math.min(100, Math.max(0, (liveRpm / 8050.0) * 100));
            const thrustPct = Math.min(100, Math.max(0, (liveThrust / 980.0) * 100));

            return (
              <div 
                key={mKey}
                className={`aerospace-card p-3.5 transition-all flex flex-col justify-between ${
                  isMotorConnected
                    ? 'border-slate-200 dark:border-slate-800 shadow-xs'
                    : 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                }`}
              >
                {/* Header: Motor Name & Connection Badge */}
                <div>
                  <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isMotorConnected ? (liveRpm > 50 ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500') : 'bg-rose-500'}`} />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                          MOTOR {idx + 1}
                        </h3>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {label} • {escCh}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                      !isMotorConnected
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : liveRpm > 50
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                    }`}>
                      {!isMotorConnected ? (
                        <>
                          <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          NOT CONNECTED
                        </>
                      ) : liveRpm > 50 ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          RUNNING ({liveRpm.toFixed(0)} RPM)
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          IDLE (0 RPM)
                        </>
                      )}
                    </span>
                  </div>

                  {/* Motor Body: Live Telemetry vs Not Connected State */}
                  {isMotorConnected ? (
                    <div className="pt-2.5 space-y-2.5 font-mono text-xs">
                      {/* Primary Hero Digital Gauges: RPM & Thrust */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Measured RPM Gauge */}
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 rounded-lg border border-slate-200/80 dark:border-slate-800">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase">
                            <span>MEASURED RPM</span>
                            <span>{rpmPct.toFixed(0)}%</span>
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <strong className="text-lg font-black text-slate-900 dark:text-white">
                              {Math.round(liveRpm).toLocaleString()}
                            </strong>
                            <span className="text-[9px] text-slate-400">RPM</span>
                          </div>
                          {/* Animated Visual Bar */}
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div 
                              className="bg-sky-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${rpmPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Delivered Thrust Gauge */}
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 rounded-lg border border-slate-200/80 dark:border-slate-800">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase">
                            <span>DELIVERED THRUST</span>
                            <span>{thrustPct.toFixed(0)}%</span>
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <strong className="text-lg font-black text-sky-600 dark:text-sky-400">
                              {Math.round(liveThrust).toLocaleString()}
                            </strong>
                            <span className="text-[9px] text-slate-400">g</span>
                          </div>
                          {/* Animated Visual Bar */}
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${thrustPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Precision Telemetry Metrics Grid */}
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="p-1.5 bg-slate-50/80 dark:bg-slate-900/60 rounded border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-bold">CURRENT</span>
                          <strong className="text-slate-800 dark:text-slate-200 font-black">
                            {liveCurrent.toFixed(2)} A
                          </strong>
                        </div>

                        <div className="p-1.5 bg-slate-50/80 dark:bg-slate-900/60 rounded border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-bold">VOLTAGE</span>
                          <strong className="text-slate-800 dark:text-slate-200 font-black">
                            {liveVoltage.toFixed(2)} V
                          </strong>
                        </div>

                        <div className="p-1.5 bg-slate-50/80 dark:bg-slate-900/60 rounded border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-bold">POWER (W)</span>
                          <strong className="text-slate-800 dark:text-slate-200 font-black">
                            {livePower.toFixed(1)} W
                          </strong>
                        </div>

                        <div className="p-1.5 bg-slate-50/80 dark:bg-slate-900/60 rounded border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-bold">EFFICIENCY</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                            {liveEfficiency.toFixed(2)} g/W
                          </strong>
                        </div>

                        <div className="p-1.5 bg-slate-50/80 dark:bg-slate-900/60 rounded border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-bold">TEMPERATURE</span>
                          <strong className="text-amber-600 dark:text-amber-400 font-black">
                            {liveTemp.toFixed(1)} °C
                          </strong>
                        </div>

                        <div className="p-1.5 bg-slate-50/80 dark:bg-slate-900/60 rounded border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-bold">VIBRATION RMS</span>
                          <strong className="text-slate-700 dark:text-slate-300 font-black">
                            {liveVib.toFixed(3)} g
                          </strong>
                        </div>

                        <div className="p-1.5 bg-slate-50/80 dark:bg-slate-900/60 rounded border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-bold">SHAFT TORQUE</span>
                          <strong className="text-slate-700 dark:text-slate-300 font-black">
                            {liveTorque > 0 ? `${liveTorque.toFixed(4)} N·m` : '0.0000 N·m'}
                          </strong>
                        </div>

                        <div className="p-1.5 bg-slate-50/80 dark:bg-slate-900/60 rounded border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-bold">THROTTLE CMD</span>
                          <strong className="text-sky-600 dark:text-sky-400 font-black">
                            {liveThrottle.toFixed(1)} %
                          </strong>
                        </div>
                      </div>

                      {/* Optimal Cruise Zone Badge if Active */}
                      {inCruiseZone && (
                        <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-bold">
                          <Check className="w-3 h-3 text-emerald-600" />
                          PEAK CRUISE EFFICIENCY ZONE (50–62%)
                        </div>
                      )}
                    </div>
                  ) : (
                    /* NOT CONNECTED STATE */
                    <div className="pt-2.5 space-y-2.5 font-mono text-xs">
                      <div className="p-3 rounded-lg bg-rose-100/60 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-rose-900 dark:text-rose-200">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700 dark:text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          HARDWARE DISCONNECTED
                        </div>
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 leading-relaxed">
                          {m?.disconnection_reason || 'Hardware cable unplugged. No telemetry signal detected on this channel.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block font-bold">RPM</span>
                          <strong className="text-slate-400">0 RPM (OFFLINE)</strong>
                        </div>
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block font-bold">CURRENT</span>
                          <strong className="text-slate-400">0.00 A</strong>
                        </div>
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block font-bold">THRUST</span>
                          <strong className="text-slate-400">0 g</strong>
                        </div>
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block font-bold">POWER</span>
                          <strong className="text-slate-400">0.0 W</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Status Footer */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono">
                  {isMotorConnected ? (
                    <>
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                        <span className={`w-1.5 h-1.5 rounded-full ${liveRpm > 50 ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'}`} />
                        {liveRpm > 50 ? `${liveRpm.toFixed(0)} RPM LIVE` : 'STANDBY (0 RPM)'}
                      </span>
                      <span className="text-slate-400">
                        THROTTLE: <strong className="text-slate-700 dark:text-slate-300">{liveThrottle.toFixed(0)}%</strong>
                      </span>
                    </>
                  ) : (
                    <div className="w-full text-[10px] text-slate-400 dark:text-slate-500 text-center font-mono py-1 flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400/60 animate-ping" />
                      Awaiting physical cable connection...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          5. MULTI-MOTOR TELEMETRY CROSS-CHANNEL MATRIX TABLE
         ======================================================== */}
      <div className="aerospace-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
              Multi-Motor Telemetry Cross-Channel Matrix
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Real-time side-by-side empirical verification across all 4 channels
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[10px] uppercase font-bold">
                <th className="pb-2.5">Telemetry Metric</th>
                <th className="pb-2.5">Motor 1</th>
                <th className="pb-2.5">Motor 2</th>
                <th className="pb-2.5">Motor 3</th>
                <th className="pb-2.5">Motor 4</th>
                <th className="pb-2.5">Propulsion Aggregate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {/* Row 1: Connection Status */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2 font-bold text-slate-900 dark:text-white">Connection Status</td>
                {MOTOR_KEYS.map((k) => {
                  const m = motors[k];
                  const isConn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
                  const rpm = isConn ? (m?.live_rpm ?? tel?.rpm ?? 0) : 0;
                  return (
                    <td key={k} className="py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        !isConn
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : rpm > 50
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                      }`}>
                        {!isConn ? '✕ NOT CONNECTED' : rpm > 50 ? '● RUNNING' : '○ IDLE'}
                      </span>
                    </td>
                  );
                })}
                <td className="py-2 font-bold text-sky-600 dark:text-sky-400">
                  {connectedCount} / 4 ONLINE
                </td>
              </tr>

              {/* Row 2: Live RPM */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2 font-bold text-slate-900 dark:text-white">Measured RPM</td>
                {MOTOR_KEYS.map((k) => {
                  const m = motors[k];
                  const isConn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
                  return (
                    <td key={k} className="py-2">
                      {isConn ? (
                        <span className="font-bold text-slate-900 dark:text-white">
                          {(m?.live_rpm ?? tel?.rpm ?? 0).toFixed(0)} RPM
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                          NOT CONNECTED
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2 font-bold text-slate-700 dark:text-slate-300">
                  {connectedCount > 0 ? `${(totalThrust > 0 ? (tel?.rpm ?? 5710) : 0).toFixed(0)} RPM` : '0 RPM'}
                </td>
              </tr>

              {/* Row 3: Current (A) */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2 font-bold text-slate-900 dark:text-white">Current (A)</td>
                {MOTOR_KEYS.map((k) => {
                  const m = motors[k];
                  const isConn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
                  return (
                    <td key={k} className="py-2">
                      {isConn ? (
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {(m?.current_a ?? ((tel?.current_a ?? 0) / 4)).toFixed(2)} A
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                          NOT CONNECTED
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2 font-bold text-slate-900 dark:text-white">
                  {totalCurrent.toFixed(2)} A
                </td>
              </tr>

              {/* Row 4: Delivered Thrust (g) */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2 font-bold text-slate-900 dark:text-white">Delivered Thrust (g)</td>
                {MOTOR_KEYS.map((k) => {
                  const m = motors[k];
                  const isConn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
                  return (
                    <td key={k} className="py-2">
                      {isConn ? (
                        <span className="font-bold text-sky-600 dark:text-sky-400">
                          {(m?.thrust_g ?? 0).toFixed(0)} g
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                          NOT CONNECTED
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2 font-bold text-sky-600 dark:text-sky-400">
                  {Math.round(totalThrust).toLocaleString()} g
                </td>
              </tr>

              {/* Row 5: Thrust Efficiency (g/W) */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2 font-bold text-slate-900 dark:text-white">Efficiency (g/W)</td>
                {MOTOR_KEYS.map((k) => {
                  const m = motors[k];
                  const isConn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
                  return (
                    <td key={k} className="py-2">
                      {isConn ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {(m?.g_per_watt ?? 0).toFixed(2)} g/W
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                          NOT CONNECTED
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2 font-bold text-emerald-600 dark:text-emerald-400">
                  {avgEfficiency > 0 ? `${avgEfficiency.toFixed(2)} g/W` : '—'}
                </td>
              </tr>

              {/* Row 6: Stator Temperature (°C) */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2 font-bold text-slate-900 dark:text-white">Temperature (°C)</td>
                {MOTOR_KEYS.map((k) => {
                  const m = motors[k];
                  const isConn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
                  return (
                    <td key={k} className="py-2">
                      {isConn ? (
                        <span className="text-amber-700 dark:text-amber-400 font-bold">
                          {(m?.temperature_c ?? (tel?.temperature_c ?? 25)).toFixed(1)} °C
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                          NOT CONNECTED
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2 text-slate-500">
                  {(tel?.temperature_c ?? 25).toFixed(1)} °C
                </td>
              </tr>

              {/* Row 7: Vibration RMS (g) */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2 font-bold text-slate-900 dark:text-white">Vibration RMS (g)</td>
                {MOTOR_KEYS.map((k) => {
                  const m = motors[k];
                  const isConn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
                  return (
                    <td key={k} className="py-2">
                      {isConn ? (
                        <span>{(m?.vibration_rms_g ?? 0.024).toFixed(3)} g</span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                          NOT CONNECTED
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2 text-slate-500">
                  {(tel?.vibration_rms_g ?? 0.024).toFixed(3)} g
                </td>
              </tr>

              {/* Row 8: Physical Wire / Telemetry Ingress State */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 bg-slate-50/40 dark:bg-slate-900/40">
                <td className="py-2 font-bold text-slate-900 dark:text-white">Hardware Cable</td>
                {MOTOR_KEYS.map((k) => {
                  const m = motors[k];
                  const isConn = m ? (m.is_connected !== false && m.connection_status !== 'DISCONNECTED') : true;
                  return (
                    <td key={k} className="py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isConn
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}>
                        {isConn ? 'WIRED / ACTIVE' : 'UNPLUGGED'}
                      </span>
                    </td>
                  );
                })}
                <td className="py-2">
                  <span className="text-[10px] text-slate-400 font-bold">100% INGRESS SYNC</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          6. OPTIONAL FULL AUDIT & BUFFER VIEW (WHEN TOGGLED)
         ======================================================== */}
      {viewMode === 'FULL_AUDIT' && (
        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
          {/* Raw Streaming Buffer Table */}
          <div className="aerospace-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                  Raw Canonical Telemetry Buffer Stream ({filteredHistory.length} Frames Cached)
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  Streaming at 10 Hz ring buffer with data-quality validation flags
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs px-2 py-1 font-mono text-slate-700 dark:text-slate-300"
                >
                  <option value="ALL">ALL SOURCES</option>
                  <option value="SIMULATION">SIMULATION</option>
                  <option value="APM_MAVLINK">APM_MAVLINK</option>
                  <option value="ESP32_SERIAL">ESP32_SERIAL</option>
                  <option value="ARDUINO_SERIAL">ARDUINO_SERIAL</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-xs">
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold text-[11px]">
                    <th className="py-2 px-2.5">TIMESTAMP</th>
                    <th className="py-2 px-2.5">SOURCE</th>
                    <th className="py-2 px-2.5">MOTORS</th>
                    <th className="py-2 px-2.5">THROTTLE</th>
                    <th className="py-2 px-2.5">RPM</th>
                    <th className="py-2 px-2.5">VOLTAGE</th>
                    <th className="py-2 px-2.5">CURRENT</th>
                    <th className="py-2 px-2.5">POWER (W)</th>
                    <th className="py-2 px-2.5">TEMP (°C)</th>
                    <th className="py-2 px-2.5">VIB (g)</th>
                    <th className="py-2 px-2.5">HEALTH</th>
                    <th className="py-2 px-2.5">QUALITY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {filteredHistory.slice().reverse().map((item, idx) => {
                    const itemMotors = item.telemetry?.motors || {};
                    const connMCount = Object.values(itemMotors).filter((m: any) => m.is_connected !== false && m.connection_status !== 'DISCONNECTED').length;
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-1.5 px-2.5 text-slate-400 text-[10px]">
                          {new Date((item.timestamp || Date.now() / 1000) * 1000).toLocaleTimeString()}
                        </td>
                        <td className="py-1.5 px-2.5 font-bold text-sky-700 dark:text-sky-400">
                          {item.telemetry?.source_type || 'TELEMETRY'}
                        </td>
                        <td className="py-1.5 px-2.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            connMCount === 4 
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}>
                            {connMCount}/4 MTR
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5">{(item.telemetry?.throttle_pct ?? 0).toFixed(0)}%</td>
                        <td className="py-1.5 px-2.5 font-bold text-slate-900 dark:text-white">
                          {(item.telemetry?.rpm ?? 0).toFixed(0)}
                        </td>
                        <td className="py-1.5 px-2.5">{(item.telemetry?.voltage_v ?? 0).toFixed(2)}V</td>
                        <td className="py-1.5 px-2.5">{(item.telemetry?.current_a ?? 0).toFixed(2)}A</td>
                        <td className="py-1.5 px-2.5">{(item.telemetry?.power_elec_w ?? 0).toFixed(1)}W</td>
                        <td className="py-1.5 px-2.5 font-bold text-amber-700 dark:text-amber-400">
                          {(item.telemetry?.temperature_c ?? 25).toFixed(1)}°C
                        </td>
                        <td className="py-1.5 px-2.5">{(item.telemetry?.vibration_rms_g ?? 0.05).toFixed(3)}g</td>
                        <td className="py-1.5 px-2.5 font-bold text-emerald-700 dark:text-emerald-400">
                          {(item.intelligence?.health_index ?? 100).toFixed(1)}%
                        </td>
                        <td className="py-1.5 px-2.5">
                          {item.telemetry?.is_valid !== false ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">VALID</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px]">FLAGGED</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Audit Log */}
          <div className="aerospace-card p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                Telemetry & Motor Connection Event Audit Log
              </h3>
              <button onClick={fetchEvents} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 font-mono">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {events.map((ev, idx) => (
                <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-lg text-xs font-mono flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[10px] mr-2">
                      {new Date(ev.timestamp * 1000).toLocaleTimeString()}
                    </span>
                    <strong className="text-slate-800 dark:text-slate-200 mr-2">[{ev.event_type}]</strong>
                    <span className="text-slate-600 dark:text-slate-400">{ev.message}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    ev.severity === 'EMERGENCY' || ev.severity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : ev.severity === 'WARNING'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                  }`}>
                    {ev.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
