import React from 'react';
import { Gauge, Clock, DownloadCloud, CheckCircle, Percent } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import type { DownloadProgressEvent } from '../types';

interface ProgressConsoleProps {
  progress: DownloadProgressEvent | null;
  overallPercentage: number;
  completedCount: number;
  totalSelectedCount: number;
  statusMessage: string;
}

export const ProgressConsole: React.FC<ProgressConsoleProps> = ({
  progress,
  overallPercentage,
  completedCount,
  totalSelectedCount,
  statusMessage,
}) => {
  const currentEpPercent = progress?.percentage ? Math.min(Math.max(progress.percentage, 0), 100) : 0;
  const safeOverallPercent = Math.min(Math.max(overallPercentage, 0), 100);

  return (
    <SpotlightCard className="p-4 flex flex-col gap-4">
      {/* Top telemetry metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Speed Metric */}
        <div className="p-2.5 rounded-lg border border-cyber-border bg-cyber-bg/70 flex items-center gap-2.5">
          <div className="p-2 rounded bg-cyber-neonCyan/10 border border-cyber-neonCyan/20">
            <Gauge className="w-4 h-4 text-cyber-neonCyan" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyber-textMuted uppercase">Speed</div>
            <div className="text-sm font-mono font-bold text-cyber-textBright">
              {progress?.speed_formatted || '0.00 MB/s'}
            </div>
          </div>
        </div>

        {/* ETA Metric */}
        <div className="p-2.5 rounded-lg border border-cyber-border bg-cyber-bg/70 flex items-center gap-2.5">
          <div className="p-2 rounded bg-cyber-neonAmber/10 border border-cyber-neonAmber/20">
            <Clock className="w-4 h-4 text-cyber-neonAmber" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyber-textMuted uppercase">ETA</div>
            <div className="text-sm font-mono font-bold text-cyber-textBright">
              {progress?.eta_formatted || '--:--'}
            </div>
          </div>
        </div>

        {/* Batch Status */}
        <div className="p-2.5 rounded-lg border border-cyber-border bg-cyber-bg/70 flex items-center gap-2.5">
          <div className="p-2 rounded bg-cyber-neonGreen/10 border border-cyber-neonGreen/20">
            <CheckCircle className="w-4 h-4 text-cyber-neonGreen" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyber-textMuted uppercase">Batch Progress</div>
            <div className="text-sm font-mono font-bold text-cyber-textBright">
              {completedCount} / {totalSelectedCount} EPs
            </div>
          </div>
        </div>

        {/* Total Percent */}
        <div className="p-2.5 rounded-lg border border-cyber-border bg-cyber-bg/70 flex items-center gap-2.5">
          <div className="p-2 rounded bg-cyber-neonPurple/10 border border-cyber-neonPurple/20">
            <Percent className="w-4 h-4 text-cyber-neonPurple" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyber-textMuted uppercase">Overall Total</div>
            <div className="text-sm font-mono font-bold text-cyber-textBright">
              {safeOverallPercent.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="flex flex-col gap-2.5">
        {/* Active Episode Bar */}
        <div>
          <div className="flex justify-between items-center text-xs font-mono mb-1">
            <span className="text-cyber-textMuted flex items-center gap-1.5">
              <DownloadCloud className="w-3.5 h-3.5 text-cyber-neonCyan" />
              {progress?.episode ? `Episode ${progress.episode} Progress` : 'Current Episode Progress'}
            </span>
            <span className="text-cyber-neonCyan font-bold">{currentEpPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 bg-cyber-bg rounded-full overflow-hidden border border-cyber-border">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300 shadow-[0_0_10px_rgba(0,229,255,0.7)]"
              style={{ width: `${currentEpPercent}%` }}
            />
          </div>
        </div>

        {/* Total Batch Bar */}
        <div>
          <div className="flex justify-between items-center text-xs font-mono mb-1">
            <span className="text-cyber-textMuted">Total Batch Pipeline</span>
            <span className="text-cyber-neonAmber font-bold">{safeOverallPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 bg-cyber-bg rounded-full overflow-hidden border border-cyber-border">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-green-400 transition-all duration-300 shadow-[0_0_10px_rgba(255,179,0,0.5)]"
              style={{ width: `${safeOverallPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Status Line */}
      <div className="text-xs font-mono text-cyber-textMuted flex items-center gap-2 border-t border-cyber-border/40 pt-2.5">
        <span className="w-2 h-2 rounded-full bg-cyber-neonCyan animate-ping" />
        <span className="text-cyber-textBright font-semibold truncate">{statusMessage}</span>
      </div>
    </SpotlightCard>
  );
};
