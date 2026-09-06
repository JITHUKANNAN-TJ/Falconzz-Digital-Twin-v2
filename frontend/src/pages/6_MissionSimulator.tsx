import React, { useState, useEffect } from 'react';
import { Compass, Play, CheckCircle2, AlertTriangle, Cloud, Thermometer, Wind } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const MissionSimulatorPage: React.FC = () => {
  const [profiles, setProfiles] = useState<any>({});
  const [selectedProfile, setSelectedProfile] = useState<string>('HIGH_ALTITUDE');
  const [durationHours, setDurationHours] = useState<number>(12);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    api.getMissionProfiles().then(setProfiles).catch(() => {});
    runSimulation('HIGH_ALTITUDE', 12);
  }, []);

  const runSimulation = async (profKey: string, dur: number) => {
    setLoading(true);
    try {
      const res = await api.simulateMission(profKey, dur);
      setSimulationResult(res);
    } catch (err) {}
    setLoading(false);
  };

  const handleProfileChange = (key: string) => {
    setSelectedProfile(key);
    runSimulation(key, durationHours);
  };

  const handleDurationChange = (dur: number) => {
    setDurationHours(dur);
    runSimulation(selectedProfile, dur);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Compass className="w-5 h-5 text-sky-600" />
          MALE UAV Mission Profile & Life Consumption Simulator
        </h2>
        <p className="text-xs text-slate-500">
          Project multi-hour degradation, equivalent operating hours consumed, and mission feasibility under diverse flight profiles
        </p>
      </div>

      {/* Control Configuration Card */}
      <div className="aerospace-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Mission Profile Selection */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              SELECT UAV FLIGHT MISSION PROFILE
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(profiles).map(([key, prof]: [string, any]) => (
                <button
                  key={key}
                  onClick={() => handleProfileChange(key)}
                  className={`text-left p-3 rounded-lg border text-xs font-semibold transition-all ${
                    selectedProfile === key
                      ? 'bg-sky-50 text-sky-900 border-sky-300 ring-1 ring-sky-300 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold mb-0.5">{prof.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    ALT: {prof.altitude_m}m | TEMP: {prof.ambient_temp_c}°C
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mission Duration Slider */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 uppercase">MISSION FLIGHT DURATION</span>
              <span className="font-mono text-base font-bold text-sky-700">{durationHours} HOURS</span>
            </div>
            <input
              type="range"
              min="1"
              max="48"
              value={durationHours}
              onChange={(e) => handleDurationChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>1 hr (Short sortie)</span>
              <span>24 hrs (Standard MALE loiter)</span>
              <span>48 hrs (Max endurance)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Results Grid */}
      {simulationResult && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="aerospace-card p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                PROJECTED FINAL HEALTH
              </span>
              <div className="text-3xl font-bold font-mono text-slate-900 my-1">
                {simulationResult.final_health}%
              </div>
              <p className="text-[11px] text-slate-500">
                Initial: {simulationResult.initial_health}% (Δ -{(simulationResult.initial_health - simulationResult.final_health).toFixed(1)}%)
              </p>
            </div>

            <div className="aerospace-card p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                EQUIVALENT LIFE CONSUMED
              </span>
              <div className="text-3xl font-bold font-mono text-purple-700 my-1">
                {simulationResult.equivalent_operating_hours} <span className="text-xs text-slate-500 font-sans">HRS</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Acceleration ratio: <strong>{simulationResult.damage_acceleration_ratio}x</strong>
              </p>
            </div>

            <div className="aerospace-card p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                PEAK WINDING TEMPERATURE
              </span>
              <div className="text-3xl font-bold font-mono text-amber-600 my-1">
                {simulationResult.peak_winding_temp_c}°C
              </div>
              <p className="text-[11px] text-slate-500">Altitude convective cooling factor</p>
            </div>

            <div className="aerospace-card p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                MISSION FEASIBILITY
              </span>
              <div className="text-xl font-bold font-mono text-emerald-600 my-1 flex items-center gap-1.5">
                {simulationResult.is_mission_feasible ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" /> FEASIBLE
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-600" /> HIGH RISK
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-500">Risk rating: <strong>{simulationResult.mission_risk}</strong></p>
            </div>
          </div>

          {/* Projected Health & Winding Temperature Trajectory */}
          <div className="aerospace-card p-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Simulated Health Decay Trajectory Over Mission Duration
                </h3>
                <p className="text-[11px] text-slate-400">
                  {simulationResult.profile_name} — {simulationResult.description}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-600 font-bold">HEALTH (%)</span>
                <span className="text-purple-600 font-bold">RUL (HOURS)</span>
              </div>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulationResult.trajectory}>
                  <defs>
                    <linearGradient id="simHealth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time_hours" stroke="#94a3b8" fontSize={11} unit="h" fontStyle="monospace" />
                  <YAxis stroke="#94a3b8" fontSize={11} fontStyle="monospace" />
                  <Tooltip />
                  <Area type="monotone" dataKey="health_index" stroke="#10b981" strokeWidth={2.5} fill="url(#simHealth)" />
                  <Area type="monotone" dataKey="rul_hours" stroke="#9333ea" strokeWidth={1.5} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
