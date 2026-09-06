import React, { useState, useEffect } from 'react';
import { Table, Download, Filter, RefreshCw, Radio, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppStore } from '../state/store';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

export const DataTelemetryPage: React.FC = () => {
  const { history, systemState } = useAppStore();
  const [events, setEvents] = useState<any[]>([]);
  const [filterSource, setFilterSource] = useState<string>('ALL');

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
    : history.filter(h => h.telemetry.source_type === filterSource);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Table className="w-5 h-5 text-sky-600" />
            Raw & Canonical Telemetry Buffer Stream
          </h2>
          <p className="text-xs text-slate-500">
            Real-time ring buffer streaming telemetry frames, data-quality validation flags, and direct CSV audit exports
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors"
        >
          <Download className="w-4 h-4" /> EXPORT TELEMETRY CSV
        </button>
      </div>

      {/* Live Ring Buffer Table */}
      <div className="aerospace-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Live Streaming Telemetry Buffer ({filteredHistory.length} Frames Cached)
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md text-xs px-2 py-1 font-mono text-slate-700"
            >
              <option value="ALL">ALL SOURCES</option>
              <option value="SIMULATION">SIMULATION</option>
              <option value="APM_MAVLINK">APM_MAVLINK</option>
              <option value="ESP32_SERIAL">ESP32_SERIAL</option>
              <option value="ARDUINO_SERIAL">ARDUINO_SERIAL</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs">
              <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                <th className="py-2 px-2.5">TIMESTAMP</th>
                <th className="py-2 px-2.5">SOURCE</th>
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
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredHistory.slice().reverse().map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-1.5 px-2.5 text-slate-400 text-[10px]">{new Date(item.timestamp * 1000).toLocaleTimeString()}</td>
                  <td className="py-1.5 px-2.5 font-bold text-sky-700">{item.telemetry.source_type}</td>
                  <td className="py-1.5 px-2.5">{item.telemetry.throttle_pct}%</td>
                  <td className="py-1.5 px-2.5 font-bold text-slate-900">{item.telemetry.rpm.toFixed(0)}</td>
                  <td className="py-1.5 px-2.5">{item.telemetry.voltage_v.toFixed(2)}V</td>
                  <td className="py-1.5 px-2.5">{item.telemetry.current_a.toFixed(2)}A</td>
                  <td className="py-1.5 px-2.5">{item.telemetry.power_elec_w.toFixed(1)}W</td>
                  <td className="py-1.5 px-2.5 font-bold text-amber-700">{item.telemetry.temperature_c.toFixed(1)}°C</td>
                  <td className="py-1.5 px-2.5">{item.telemetry.vibration_rms_g.toFixed(3)}g</td>
                  <td className="py-1.5 px-2.5 font-bold text-emerald-700">{item.intelligence.health_index.toFixed(1)}%</td>
                  <td className="py-1.5 px-2.5">
                    {item.telemetry.is_valid ? (
                      <span className="text-emerald-600 font-bold text-[10px]">VALID</span>
                    ) : (
                      <span className="text-rose-600 font-bold text-[10px]">FLAGGED</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Event History */}
      <div className="aerospace-card p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            System & Operator Event Audit Log
          </h3>
          <button onClick={fetchEvents} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="space-y-2 max-h-[220px] overflow-y-auto">
          {events.map((ev, idx) => (
            <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-mono flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] mr-2">
                  {new Date(ev.timestamp * 1000).toLocaleTimeString()}
                </span>
                <strong className="text-slate-800 mr-2">[{ev.event_type}]</strong>
                <span className="text-slate-600">{ev.message}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                ev.severity === 'EMERGENCY' || ev.severity === 'CRITICAL'
                  ? 'bg-rose-100 text-rose-800'
                  : ev.severity === 'WARNING'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-sky-50 text-sky-700'
              }`}>
                {ev.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
