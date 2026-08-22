import React, { useState } from 'react';
import { CheckSquare, Square, CheckCircle2, ListFilter } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

interface EpisodeGridProps {
  totalEpisodes: number;
  selectedEpisodes: number[];
  completedEpisodes: number[];
  currentEpisode: number | null;
  onToggleEpisode: (epNum: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectRange: (start: number, end: number) => void;
  disabled?: boolean;
}

export const EpisodeGrid: React.FC<EpisodeGridProps> = ({
  totalEpisodes,
  selectedEpisodes,
  completedEpisodes,
  currentEpisode,
  onToggleEpisode,
  onSelectAll,
  onDeselectAll,
  onSelectRange,
  disabled = false,
}) => {
  const [rangeInput, setRangeInput] = useState('');

  if (totalEpisodes <= 0) return null;

  const handleApplyRange = () => {
    if (!rangeInput.trim()) return;
    const match = rangeInput.match(/^(\d+)\s*-\s*(\d+)$/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (start >= 1 && end >= start) {
        onSelectRange(start, Math.min(end, totalEpisodes));
        setRangeInput('');
      }
    }
  };

  const isAllSelected = selectedEpisodes.length === totalEpisodes;

  return (
    <SpotlightCard className="p-4 flex flex-col gap-3">
      {/* Matrix Controls & Summary */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-cyber-neonCyan uppercase tracking-wider flex items-center gap-1.5">
            <ListFilter className="w-3.5 h-3.5" />
            Episode Matrix
          </span>
          <span className="px-2 py-0.5 rounded bg-cyber-card border border-cyber-border text-[11px] font-mono text-cyber-textMuted">
            Selected: <strong className="text-cyber-neonCyan">{selectedEpisodes.length}</strong> / {totalEpisodes}
          </span>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={disabled}
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
            className="hud-button flex items-center gap-1 px-2.5 py-1 rounded bg-cyber-card hover:bg-cyber-card/80 border border-cyber-border text-[11px] font-mono text-cyber-textBright transition-all disabled:opacity-50"
          >
            {isAllSelected ? (
              <>
                <Square className="w-3 h-3 text-cyber-neonRose" />
                <span>DESELECT ALL</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-3 h-3 text-cyber-neonGreen" />
                <span>SELECT ALL</span>
              </>
            )}
          </button>

          {/* Quick Range Selector */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="e.g. 1-20"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyRange()}
              className="w-20 px-2 py-1 bg-cyber-bg border border-cyber-border rounded text-xs font-mono text-center text-cyber-textBright placeholder:text-cyber-textMuted/40 focus:outline-none focus:border-cyber-neonCyan"
            />
            <button
              type="button"
              disabled={disabled || !rangeInput.trim()}
              onClick={handleApplyRange}
              className="px-2 py-1 rounded bg-cyber-card hover:bg-cyber-card/80 border border-cyber-border text-[11px] font-mono text-cyber-neonAmber disabled:opacity-40 transition-all"
            >
              RANGE
            </button>
          </div>
        </div>
      </div>

      {/* Episode Checkbox Grid */}
      <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
        {Array.from({ length: totalEpisodes }, (_, i) => {
          const epNum = i + 1;
          const isSelected = selectedEpisodes.includes(epNum);
          const isCompleted = completedEpisodes.includes(epNum);
          const isCurrent = currentEpisode === epNum;

          return (
            <button
              key={epNum}
              type="button"
              disabled={disabled}
              onClick={() => onToggleEpisode(epNum)}
              className={`hud-button relative flex items-center justify-center py-1.5 px-1 rounded text-xs font-mono font-semibold transition-all ${
                isCurrent
                  ? 'bg-cyber-neonAmber/20 border-2 border-cyber-neonAmber text-cyber-neonAmber shadow-[0_0_12px_rgba(255,179,0,0.5)] animate-pulse'
                  : isCompleted
                  ? 'bg-cyber-neonGreen/10 border border-cyber-neonGreen/40 text-cyber-neonGreen'
                  : isSelected
                  ? 'bg-cyber-neonCyan/15 border border-cyber-neonCyan/60 text-cyber-neonCyan shadow-[0_0_8px_rgba(0,229,255,0.15)]'
                  : 'bg-cyber-bg/60 border border-cyber-border/40 text-cyber-textMuted/60 hover:border-cyber-border hover:text-cyber-textMuted'
              } disabled:cursor-not-allowed`}
            >
              <span>{epNum}</span>
              {isCompleted && (
                <CheckCircle2 className="w-2.5 h-2.5 text-cyber-neonGreen absolute top-0.5 right-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </SpotlightCard>
  );
};
