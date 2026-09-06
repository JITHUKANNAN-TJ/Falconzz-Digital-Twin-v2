import React, { useState, useEffect } from 'react';
import { PlaySquare, Play, Pause, RotateCcw, FastForward, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

export const MissionReplayPage: React.FC = () => {
  const [replayData, setReplayData] = useState<any>(null);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);

  const fetchReplayData = async () => {
    try {
      const data = await api.getAllReplayFrames();
      setReplayData(data);
      setCurrentFrameIdx(data.current_frame_idx);
      setIsPlaying(data.is_playing);
      setSpeed(data.playback_speed);
    } catch (err) {}
  };

  useEffect(() => {
    fetchReplayData();
  }, []);

  useEffect(() => {
    let timer: any = null;
    if (isPlaying && replayData?.frames) {
      timer = setInterval(() => {
        setCurrentFrameIdx((prev) => (prev + 1) % replayData.frames.length);
      }, 500 / speed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, speed, replayData]);

  const handlePlay = () => {
    setIsPlaying(true);
    api.controlReplay('play');
  };

  const handlePause = () => {
    setIsPlaying(false);
    api.controlReplay('pause');
  };

  const handleReset = () => {
    setCurrentFrameIdx(0);
    setIsPlaying(false);
    api.controlReplay('reset');
  };

  const handleSeek = (idx: number) => {
    setCurrentFrameIdx(idx);
    api.controlReplay('seek', idx);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    api.controlReplay('speed', undefined, newSpeed);
  };

  const currentFrame = replayData?.frames?.[currentFrameIdx] || null;
  const tel = currentFrame?.telemetry;
  const health = currentFrame?.health;
  const totalFrames = replayData?.frames?.length || 120;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <PlaySquare className="w-5 h-5 text-sky-600" />
          Deterministic Flight Mission Replay & Black-Box Telemetry Analyzer
        </h2>
        <p className="text-xs text-slate-500">
          Playback timestamped historical flight phases (Takeoff, Climb, Cruise, Ingress, Bearing Inception, Thermal Rise, RTB)
        </p>
      </div>

      {/* Playback Control Deck */}
      <div className="aerospace-card p-4 bg-gradient-to-r from-slate-900 to-sky-950 text-white border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
              FLIGHT PHASE:
            </span>
            <h3 className="text-base font-bold text-white font-mono">
              {currentFrame?.flight_phase || 'STANDBY'}
            </h3>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Reset to start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {isPlaying ? (
              <button
                onClick={handlePause}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm"
              >
                <Pause className="w-4 h-4" /> PAUSE
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm"
              >
                <Play className="w-4 h-4" /> PLAY REPLAY
              </button>
            )}

            {/* Speed Multipliers */}
            <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs font-mono">
              {[0.5, 1.0, 2.0, 4.0].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-1 rounded font-bold ${speed === s ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrubbing Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-mono text-slate-400">
            <span>FRAME: {currentFrameIdx + 1} / {totalFrames}</span>
            <span>MISSION TIME: {currentFrame ? `${currentFrame.mission_time_sec.toFixed(0)}s` : '0s'}</span>
          </div>
          <input
            type="range"
            min="0"
            max={totalFrames - 1}
            value={currentFrameIdx}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>
      </div>

      {/* Synchronized Telemetry State at this Replay Frame */}
      {currentFrame && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="aerospace-card p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              REPLAY ROTATIONAL SPEED
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {tel?.rpm?.toFixed(0)} <span className="text-xs text-slate-500 font-sans">RPM</span>
            </div>
            <p className="text-[11px] text-slate-500">Throttle: {tel?.throttle_pct}%</p>
          </div>

          <div className="aerospace-card p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              REPLAY WINDING TEMP
            </span>
            <div className="text-2xl font-bold font-mono text-amber-600">
              {tel?.temperature_c?.toFixed(1)} <span className="text-xs text-slate-500 font-sans">°C</span>
            </div>
            <p className="text-[11px] text-slate-500">Current: {tel?.current_a?.toFixed(1)}A</p>
          </div>

          <div className="aerospace-card p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              REPLAY HEALTH INDEX
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {health?.health_index?.toFixed(1)}%
            </div>
            <p className="text-[11px] text-slate-500">Band: {health?.health_band}</p>
          </div>

          <div className="aerospace-card p-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              REPLAY RUL ESTIMATE
            </span>
            <div className="text-2xl font-bold font-mono text-purple-600">
              {health?.rul_hours?.toFixed(1)} <span className="text-xs text-slate-500 font-sans">HRS</span>
            </div>
            <p className="text-[11px] text-slate-500">Fault: {health?.predicted_fault}</p>
          </div>
        </div>
      )}

      {/* Frame Diagnostic Summary */}
      {health && (
        <div className="aerospace-card p-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Replay Frame AI Diagnostics & Maintenance Action
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">XAI REASONING:</span>
              <p className="text-slate-600">{health.xai_why}</p>
            </div>
            <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
              <span className="font-bold text-sky-900 block mb-1">PRESCRIBED MAINTENANCE ACTION:</span>
              <p className="text-sky-800">{health.maintenance_action}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
