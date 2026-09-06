import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Award, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../state/store';
import { api } from '../services/api';

export const DemoBar: React.FC = () => {
  const { demoState, refreshDemoState } = useAppStore();

  if (!demoState) return null;

  const currentIdx = demoState.current_phase_index;
  const isRunning = demoState.is_running;

  const handleStart = async () => {
    await api.startDemo(true);
    await refreshDemoState();
  };

  const handleStop = async () => {
    await api.stopDemo();
    await refreshDemoState();
  };

  const handleNext = async () => {
    await api.nextDemoPhase();
    await refreshDemoState();
  };

  const handlePrev = async () => {
    await api.prevDemoPhase();
    await refreshDemoState();
  };

  const handleJump = async (idx: number) => {
    await api.jumpToDemoPhase(idx);
    await refreshDemoState();
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-4 rounded-xl shadow-md mb-4 border border-sky-800/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-sky-400" />
          <div>
            <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">
              SIH 2026 EVALUATION SUITE: ONE-CLICK DEMONSTRATOR
            </span>
            <h2 className="text-sm font-bold text-white">
              {demoState.current_phase?.title || 'Phase 1: Normal Baseline'}
            </h2>
          </div>
        </div>

        {/* Demo Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Previous Phase"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {isRunning ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              PAUSE DEMO
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              START SIH DEMO
            </button>
          )}

          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Next Phase"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-300 mb-3 font-normal">
        {demoState.current_phase?.description}
      </p>

      {/* 7-Phase Stepper */}
      <div className="grid grid-cols-7 gap-1.5 pt-2 border-t border-slate-800">
        {demoState.all_phases.map((phase, idx) => {
          const isPassed = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <button
              key={idx}
              onClick={() => handleJump(idx)}
              className={`text-left p-1.5 rounded-md transition-all ${
                isCurrent
                  ? 'bg-sky-600 text-white font-bold ring-1 ring-sky-300 shadow-xs'
                  : isPassed
                  ? 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-900/60 text-slate-500 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1 text-[10px]">
                {isPassed ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <span className="w-3 h-3 flex items-center justify-center font-mono font-bold">
                    {idx + 1}
                  </span>
                )}
                <span className="truncate font-semibold">{phase.title.split(':')[1]?.trim() || `P${idx + 1}`}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
