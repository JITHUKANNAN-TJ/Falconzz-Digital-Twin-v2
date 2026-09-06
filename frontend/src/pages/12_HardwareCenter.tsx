import React, { useState, useEffect } from 'react';
import { Radio, Cpu, Power, CheckCircle, AlertCircle, RefreshCw, Layers, ShieldCheck, Database, FileText, HardDrive, Download, Disc, Sliders, Activity, HelpCircle, Save } from 'lucide-react';
import { api } from '../services/api';
import { useAppStore } from '../state/store';
import { APMConnectionCard } from '../components/APMConnectionCard';
import { StatusBadge } from '../components/StatusBadge';

export const HardwareCenterPage: React.FC = () => {
  const { systemState } = useAppStore();
  const [hwStatus, setHwStatus] = useState<any>(null);
  const [diag, setDiag] = useState<any>(null);
  const [recStatus, setRecStatus] = useState<any>(null);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [calibConfig, setCalibConfig] = useState<any>(null);
  const [calibSaving, setCalibSaving] = useState<boolean>(false);
  const [mappingConfig, setMappingConfig] = useState<any>(null);
  const [mappingSaving, setMappingSaving] = useState<boolean>(false);
  const [discoveryData, setDiscoveryData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'MAPPING' | 'DISCOVERY' | 'PROVENANCE' | 'CALIBRATION' | 'RECORDER'>('MAPPING');

  const fetchStatus = async () => {
    try {
      const [hw, d, rec, recList, calib, mapRes, discRes] = await Promise.all([
        api.getHardwareStatus(),
        api.getAPMDiagnostics(),
        api.getRecordingStatus(),
        api.listRecordings(),
        api.getMotorCalibration(),
        api.getMotorMapping(),
        api.getMavlinkDiscovery()
      ]);
      setHwStatus(hw);
      setDiag(d);
      setRecStatus(rec);
      if (recList?.recordings) setRecordings(recList.recordings);
      if (calib && !calibConfig) setCalibConfig(calib);
      if (mapRes?.mappings && !mappingConfig) setMappingConfig(mapRes.mappings);
      if (discRes) setDiscoveryData(discRes);
    } catch (err) {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartRecording = async () => {
    await api.startRecording();
    await fetchStatus();
  };

  const handleStopRecording = async () => {
    await api.stopRecording();
    await fetchStatus();
  };

  const handleSaveCalibration = async () => {
    if (!calibConfig) return;
    setCalibSaving(true);
    await api.updateMotorCalibration(calibConfig);
    setCalibSaving(false);
    await fetchStatus();
  };

  const handleSaveMapping = async () => {
    if (!mappingConfig) return;
    setMappingSaving(true);
    await api.updateMotorMapping(mappingConfig);
    setMappingSaving(false);
    await fetchStatus();
  };

  const motors = systemState?.telemetry?.motors || {};

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Radio className="w-5 h-5 text-sky-600" />
          Hardware Center & Quadcopter MAVLink Telemetry Foundation
        </h2>
        <p className="text-xs text-slate-500">
          Hardware-First Interface: Direct APM/ArduPilot serial connection, runtime message discovery, 4-motor channel mapper, and testbed calibration.
        </p>
      </div>

      {/* APM / ArduPilot Primary Connection Card */}
      <APMConnectionCard />

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-1 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('MAPPING')}
          className={`px-3 py-1.5 rounded-t-lg flex items-center gap-1.5 transition-colors ${
            activeTab === 'MAPPING'
              ? 'bg-sky-50 text-sky-700 border-b-2 border-sky-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          4-Motor Channel Mapping & Status
        </button>

        <button
          onClick={() => setActiveTab('DISCOVERY')}
          className={`px-3 py-1.5 rounded-t-lg flex items-center gap-1.5 transition-colors ${
            activeTab === 'DISCOVERY'
              ? 'bg-sky-50 text-sky-700 border-b-2 border-sky-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          MAVLink Discovery & Raw Trace
        </button>

        <button
          onClick={() => setActiveTab('PROVENANCE')}
          className={`px-3 py-1.5 rounded-t-lg flex items-center gap-1.5 transition-colors ${
            activeTab === 'PROVENANCE'
              ? 'bg-sky-50 text-sky-700 border-b-2 border-sky-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Field Provenance Matrix
        </button>

        <button
          onClick={() => setActiveTab('CALIBRATION')}
          className={`px-3 py-1.5 rounded-t-lg flex items-center gap-1.5 transition-colors ${
            activeTab === 'CALIBRATION'
              ? 'bg-sky-50 text-sky-700 border-b-2 border-sky-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Motor Calibration Matrix
        </button>

        <button
          onClick={() => setActiveTab('RECORDER')}
          className={`px-3 py-1.5 rounded-t-lg flex items-center gap-1.5 transition-colors ${
            activeTab === 'RECORDER'
              ? 'bg-sky-50 text-sky-700 border-b-2 border-sky-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Disc className="w-3.5 h-3.5" />
          Flight Telemetry Recorder {recStatus?.is_recording && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
        </button>
      </div>

      {/* TAB 1: 4-MOTOR CHANNEL MAPPING & REAL STATUS */}
      {activeTab === 'MAPPING' && (
        <div className="space-y-4">
          <div className="aerospace-card p-4">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-600" />
                  Physical Motor ↔ ESC Instance ↔ ArduPilot Servo Channel Mapping
                </h3>
                <p className="text-[11px] text-slate-500">
                  Do not assume motor numbering is fixed. Configure how incoming MAVLink ESC telemetry and servo PWM channels route to each physical BLDC motor.
                </p>
              </div>

              <button
                onClick={handleSaveMapping}
                disabled={mappingSaving}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-1.5 px-4 rounded-lg flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {mappingSaving ? 'SAVING MAPPINGS...' : 'SAVE MOTOR MAPPINGS'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                    <th className="pb-2">Physical Motor</th>
                    <th className="pb-2">Assigned Label</th>
                    <th className="pb-2">ESC Telemetry Instance</th>
                    <th className="pb-2">ArduPilot Servo Output</th>
                    <th className="pb-2">Measured Live RPM</th>
                    <th className="pb-2">Rated User RPM</th>
                    <th className="pb-2">Live Current (A)</th>
                    <th className="pb-2">Live Temp (°C)</th>
                    <th className="pb-2">Channel Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(['motor_1', 'motor_2', 'motor_3', 'motor_4'] as const).map((mId, idx) => {
                    const mData = motors[mId];
                    const mapItem = mappingConfig?.[mId] || {};
                    const isReal = mData?.status === 'REAL';

                    return (
                      <tr key={mId} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-sans font-bold text-slate-900">
                          Motor {idx + 1}
                        </td>
                        <td className="py-2.5">
                          <input
                            type="text"
                            value={mapItem.label || ''}
                            onChange={(e) => {
                              setMappingConfig({
                                ...mappingConfig,
                                [mId]: { ...mapItem, label: e.target.value }
                              });
                            }}
                            className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-800 w-44"
                          />
                        </td>
                        <td className="py-2.5">
                          <select
                            value={mapItem.esc_instance ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseInt(e.target.value);
                              setMappingConfig({
                                ...mappingConfig,
                                [mId]: { ...mapItem, esc_instance: val }
                              });
                            }}
                            className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-800"
                          >
                            <option value="">None / Unmapped</option>
                            <option value="0">ESC Instance 0</option>
                            <option value="1">ESC Instance 1</option>
                            <option value="2">ESC Instance 2</option>
                            <option value="3">ESC Instance 3</option>
                          </select>
                        </td>
                        <td className="py-2.5">
                          <select
                            value={mapItem.servo_channel ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseInt(e.target.value);
                              setMappingConfig({
                                ...mappingConfig,
                                [mId]: { ...mapItem, servo_channel: val }
                              });
                            }}
                            className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-800"
                          >
                            <option value="">None / Unmapped</option>
                            <option value="1">Servo 1 (ch1)</option>
                            <option value="2">Servo 2 (ch2)</option>
                            <option value="3">Servo 3 (ch3)</option>
                            <option value="4">Servo 4 (ch4)</option>
                          </select>
                        </td>
                        <td className="py-2.5 font-bold">
                          {mData?.live_rpm !== null && mData?.live_rpm !== undefined ? (
                            <span className="text-emerald-700">{mData.live_rpm.toFixed(0)} RPM</span>
                          ) : (
                            <span className="text-slate-400 font-normal">UNAVAILABLE</span>
                          )}
                        </td>
                        <td className="py-2.5 text-sky-700">
                          {mData?.rated_rpm || 100} RPM (Configured)
                        </td>
                        <td className="py-2.5">
                          {mData?.current_a !== null && mData?.current_a !== undefined ? (
                            <span className="text-slate-800 font-bold">{mData.current_a.toFixed(2)} A</span>
                          ) : (
                            <span className="text-slate-400">UNAVAILABLE</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          {mData?.temperature_c !== null && mData?.temperature_c !== undefined ? (
                            <span className="text-slate-800">{mData.temperature_c.toFixed(1)} °C</span>
                          ) : (
                            <span className="text-slate-400">UNAVAILABLE</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${
                              isReal
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {mData?.status || 'UNAVAILABLE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong>Important Telemetry Note:</strong> If your ESCs do not have telemetry wires soldered or DShot telemetry configured in ArduPilot, RPM/Current/Temp will accurately show <code>UNAVAILABLE</code>. The system will never fabricate artificial motor numbers.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MAVLINK DISCOVERY & RAW TRACE */}
      {activeTab === 'DISCOVERY' && (
        <div className="space-y-4">
          <div className="aerospace-card p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-600" />
                  Runtime MAVLink Message Discovery Table
                </h3>
                <p className="text-[11px] text-slate-500">
                  Automatically tracks and discovers which MAVLink messages are actually broadcasting from the connected APM/ArduPilot.
                </p>
              </div>
              <button
                onClick={fetchStatus}
                className="text-xs font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 border border-slate-200 px-2 py-1 rounded"
              >
                <RefreshCw className="w-3 h-3" /> REFRESH DISCOVERY
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                    <th className="pb-2">MAVLink Message</th>
                    <th className="pb-2">Discovery Status</th>
                    <th className="pb-2">Packet Count</th>
                    <th className="pb-2">Last Age (s)</th>
                    <th className="pb-2">Decoded Sample Keys</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discoveryData?.message_discovery && discoveryData.message_discovery.length > 0 ? (
                    discoveryData.message_discovery.map((m: any, idx: number) => {
                      let badge = 'bg-slate-100 text-slate-500 border-slate-200';
                      if (m.status === 'AVAILABLE') badge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      else if (m.status === 'STALE') badge = 'bg-amber-50 text-amber-700 border-amber-200';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 font-bold text-slate-900">{m.msg_type}</td>
                          <td className="py-2">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${badge}`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="py-2 text-slate-700">{m.count}</td>
                          <td className="py-2 text-slate-600">{m.last_received_age_sec !== null ? `${m.last_received_age_sec}s` : 'Never'}</td>
                          <td className="py-2 text-slate-500 truncate max-w-xs">{JSON.stringify(Object.keys(m.sample_fields || {}))}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                        No MAVLink messages discovered yet. Connect APM flight controller to start ingestion.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="aerospace-card p-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Raw MAVLink Packet Trace (Last 25 Decoded Frames)
            </h3>
            <div className="h-60 overflow-y-auto bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] space-y-1.5">
              {diag?.recent_messages && diag.recent_messages.length > 0 ? (
                diag.recent_messages.map((msg: any, idx: number) => (
                  <div key={idx} className="border-b border-slate-800 pb-1 flex gap-2">
                    <span className="text-sky-400 font-bold">[{msg.timestamp}]</span>
                    <span className="text-amber-400 font-semibold">{msg.msg_type}</span>
                    <span className="text-slate-400">SysID:{msg.sys_id}</span>
                    <span className="text-slate-300 truncate">{JSON.stringify(msg.fields)}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic text-center py-6">
                  Raw packet stream waiting for MAVLink connection...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FIELD PROVENANCE MATRIX */}
      {activeTab === 'PROVENANCE' && (
        <div className="aerospace-card p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-600" />
                Field-by-Field Ingress Telemetry Availability Matrix
              </h3>
              <p className="text-[11px] text-slate-500">
                Strict provenance verification. Missing sensors display <code>UNAVAILABLE</code> without artificial data synthesis.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                  <th className="pb-2">Telemetry Channel</th>
                  <th className="pb-2">Source MAVLink Message</th>
                  <th className="pb-2">Availability Status</th>
                  <th className="pb-2">Sample Telemetry Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discoveryData?.field_availability && discoveryData.field_availability.length > 0 ? (
                  discoveryData.field_availability.map((f: any, idx: number) => {
                    const isAvail = f.status === 'AVAILABLE';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 text-slate-900 font-sans font-bold">{f.field}</td>
                        <td className="py-2 text-sky-700">{f.source}</td>
                        <td className="py-2">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${
                              isAvail
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {f.status}
                          </span>
                        </td>
                        <td className="py-2 text-slate-800 font-bold">{f.sample_value}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                      Scanning telemetry channels...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MOTOR CALIBRATION MATRIX */}
      {activeTab === 'CALIBRATION' && (
        <div className="aerospace-card p-4 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-600" />
                Physical Quadcopter Motor Calibration Matrix
              </h3>
              <p className="text-[11px] text-slate-500">
                Motor constants are labeled <span className="text-amber-700 font-bold">CONFIGURED / NOT YET CALIBRATED</span> until confirmed by empirical testbed runs.
              </p>
            </div>

            <button
              onClick={handleSaveCalibration}
              disabled={calibSaving}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-1.5 px-4 rounded-lg flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {calibSaving ? 'SAVING...' : 'SAVE MOTOR CALIBRATION'}
            </button>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-mono flex justify-between items-center">
            <span>CALIBRATION STATUS: <strong>{calibConfig?.calibration_status || 'CONFIGURED / NOT YET CALIBRATED'}</strong></span>
            <span>MOTOR TYPE: <strong>{calibConfig?.motor_name || 'A2212 1000Kv BLDC'}</strong></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Configured Rated RPM (User Parameter)</label>
              <input
                type="number"
                value={calibConfig?.target_rated_rpm ?? 100}
                onChange={(e) => setCalibConfig({ ...calibConfig, target_rated_rpm: parseFloat(e.target.value) || 100 })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 block">Baseline rated operating point for the testbed.</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Velocity Constant Kv (RPM/V)</label>
              <input
                type="number"
                value={calibConfig?.kv_rpm_per_v ?? 1000}
                onChange={(e) => setCalibConfig({ ...calibConfig, kv_rpm_per_v: parseFloat(e.target.value) || 1000 })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 block">Configured uncalibrated BLDC velocity constant.</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Internal Resistance Rm (Ω)</label>
              <input
                type="number"
                step="0.005"
                value={calibConfig?.internal_resistance_ohms ?? 0.090}
                onChange={(e) => setCalibConfig({ ...calibConfig, internal_resistance_ohms: parseFloat(e.target.value) || 0.090 })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 block">Phase-to-phase armature resistance.</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">No-Load Current I0 (A)</label>
              <input
                type="number"
                step="0.05"
                value={calibConfig?.no_load_current_a ?? 0.50}
                onChange={(e) => setCalibConfig({ ...calibConfig, no_load_current_a: parseFloat(e.target.value) || 0.50 })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 block">Idle current draw under zero propeller drag.</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Nominal Battery Pack (V)</label>
              <input
                type="number"
                step="0.1"
                value={calibConfig?.nominal_voltage_v ?? 11.1}
                onChange={(e) => setCalibConfig({ ...calibConfig, nominal_voltage_v: parseFloat(e.target.value) || 11.1 })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 block">3S LiPo pack nominal voltage.</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Max Current Limit (A)</label>
              <input
                type="number"
                value={calibConfig?.max_safe_current_a ?? 15.0}
                onChange={(e) => setCalibConfig({ ...calibConfig, max_safe_current_a: parseFloat(e.target.value) || 15.0 })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 block">Safety cutoff limit per motor channel.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FLIGHT TELEMETRY RECORDER */}
      {activeTab === 'RECORDER' && (
        <div className="space-y-4">
          <div className="aerospace-card p-4">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Disc className="w-4 h-4 text-rose-600" />
                  Real-Time Quadcopter Flight Telemetry Data Logger
                </h3>
                <p className="text-[11px] text-slate-500">
                  Records real MAVLink packets and canonical 4-motor telemetry frames to disk for empirical model calibration.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {recStatus?.is_recording ? (
                  <button
                    onClick={handleStopRecording}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-1.5 px-4 rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <Power className="w-3.5 h-3.5" /> STOP RECORDING ({recStatus?.sample_count || 0} samples)
                  </button>
                ) : (
                  <button
                    onClick={handleStartRecording}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-4 rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <Disc className="w-3.5 h-3.5" /> START FLIGHT RECORDING
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono flex justify-between items-center text-slate-700">
              <span>STATUS: <strong className={recStatus?.is_recording ? 'text-rose-600' : 'text-slate-600'}>{recStatus?.is_recording ? 'RECORDING IN PROGRESS' : 'IDLE'}</strong></span>
              <span>SESSION: <strong>{recStatus?.session?.session_id || 'None'}</strong></span>
              <span>SAMPLES CAPTURED: <strong>{recStatus?.sample_count || 0}</strong></span>
            </div>
          </div>

          <div className="aerospace-card p-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-sky-600" />
              Recorded Flight Logs on Disk
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                    <th className="pb-2">Session ID</th>
                    <th className="pb-2">Created Timestamp</th>
                    <th className="pb-2">Total Samples</th>
                    <th className="pb-2">Data Source</th>
                    <th className="pb-2">Export Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recordings.length > 0 ? (
                    recordings.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 text-slate-900 font-bold">{r.session_id}</td>
                        <td className="py-2 text-slate-600">{r.created_at}</td>
                        <td className="py-2 text-sky-700 font-bold">{r.samples} frames</td>
                        <td className="py-2 text-slate-600">{r.data_source}</td>
                        <td className="py-2 flex items-center gap-2">
                          <a
                            href={`/api/telemetry/record/export/${r.session_id}.csv`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> CSV
                          </a>
                          <a
                            href={`/api/telemetry/record/export/${r.session_id}.json`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> JSON
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                        No recorded flight logs on disk yet. Click Start Flight Recording to capture live telemetry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
