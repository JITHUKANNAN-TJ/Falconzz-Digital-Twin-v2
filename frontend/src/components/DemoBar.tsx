import React from 'react';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { useAppStore } from '../state/store';
import { api } from '../services/api';

export const DemoBar: React.FC = () => {
  const { demoState, refreshDemoState } = useAppStore();
  if (!demoState) return null;
  const currentIdx = demoState.current_phase_index;
  const isRunning = demoState.is_running;
  const handleStart = async () => { await api.startDemo(true); await refreshDemoState(); };
  const handleStop = async () => { await api.stopDemo(); await refreshDemoState(); };
  const handleNext = async () => { await api.nextDemoPhase(); await refreshDemoState(); };
  const handlePrev = async () => { await api.prevDemoPhase(); await refreshDemoState(); };
  const handleJump = async (idx: number) => { await api.jumpToDemoPhase(idx); await refreshDemoState(); };

  return (
    <div className="aerospace-card p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="text-[11px] font-medium tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            Demonstration • {currentIdx + 1} / 7
          </div>
          <h2 className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>
            {demoState.current_phase?.title || 'Phase 1: Normal Baseline'}
          </h2>
          <p className="text-xs mt-1 max-w-[560px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {demoState.current_phase?.description}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handlePrev} className="w-8 h-8 rounded-md border flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-900" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <SkipBack className="w-4 h-4" />
          </button>
          {isRunning ? (
            <button onClick={handleStop} className="h-8 px-4 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-medium flex items-center gap-1.5">
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          ) : (
            <button onClick={handleStart} className="h-8 px-4 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-medium flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 fill-current" /> Start
            </button>
          )}
          <button onClick={handleNext} className="w-8 h-8 rounded-md border flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-900" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        {demoState.all_phases.map((phase: any, idx: number) => {
          const isCurrent = idx === currentIdx;
          const isPassed = idx < currentIdx;
          return (
            <button
              key={idx}
              onClick={() => handleJump(idx)}
              className="text-left p-2.5 rounded-md border text-xs leading-tight transition-colors"
              style={
                isCurrent
                  ? { background: 'var(--text)', color: 'var(--bg)', borderColor: 'var(--text)' }
                  : isPassed
                  ? { background: 'var(--accent-soft)', color: 'var(--text)', borderColor: 'var(--border)' }
                  : { background: 'var(--card)', color: 'var(--text-faint)', borderColor: 'var(--border)' }
              }
            >
              <span className="block text-[11px] font-medium">0{idx + 1}</span>
              <span className="block truncate mt-1 text-[11px]">{phase.title.split(':')[1]?.trim() || `Phase ${idx + 1}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
