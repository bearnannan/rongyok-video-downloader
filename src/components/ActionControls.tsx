import React from 'react';
import { Play, Pause, PlayCircle, StopCircle, RotateCcw, Combine, Trash2 } from 'lucide-react';
import type { DownloadStatus } from '../types';

interface ActionControlsProps {
  status: DownloadStatus;
  autoMerge: boolean;
  setAutoMerge: (val: boolean) => void;
  deleteParts: boolean;
  setDeleteParts: (val: boolean) => void;
  hasSeries: boolean;
  hasSelectedEpisodes: boolean;
  onDownload: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onResumePrevious: () => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  status,
  autoMerge,
  setAutoMerge,
  deleteParts,
  setDeleteParts,
  hasSeries,
  hasSelectedEpisodes,
  onDownload,
  onPause,
  onResume,
  onCancel,
  onResumePrevious,
}) => {
  const isDownloading = status === 'downloading';
  const isPaused = status === 'paused';
  const isBusy = isDownloading || isPaused || status === 'merging' || status === 'fetching';

  return (
    <div className="flex flex-col gap-3">
      {/* Settings Switches */}
      <div className="flex items-center justify-between flex-wrap gap-4 px-3 py-2 rounded-lg border border-cyber-border bg-cyber-surface/60 backdrop-blur-md">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-cyber-textBright">
          <input
            type="checkbox"
            checked={autoMerge}
            disabled={isBusy}
            onChange={(e) => setAutoMerge(e.target.checked)}
            className="w-4 h-4 rounded border-cyber-border bg-cyber-bg text-cyber-neonCyan focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <Combine className="w-3.5 h-3.5 text-cyber-neonCyan" />
          <span>Auto-Merge episodes into single MP4 via FFmpeg</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-cyber-textBright">
          <input
            type="checkbox"
            checked={deleteParts}
            disabled={isBusy || !autoMerge}
            onChange={(e) => setDeleteParts(e.target.checked)}
            className="w-4 h-4 rounded border-cyber-border bg-cyber-bg text-cyber-neonAmber focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <Trash2 className="w-3.5 h-3.5 text-cyber-neonAmber" />
          <span>Delete individual episode files after merge</span>
        </label>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Main Download Button */}
        <button
          type="button"
          disabled={!hasSeries || !hasSelectedEpisodes || isBusy}
          onClick={onDownload}
          className={`hud-button flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-mono font-bold tracking-wider text-sm transition-all ${
            !hasSeries || !hasSelectedEpisodes || isBusy
              ? 'bg-cyber-card border border-cyber-border text-cyber-textMuted/50 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300 border border-cyber-neonCyan text-black shadow-[0_0_20px_rgba(0,229,255,0.4)]'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>START DOWNLOAD</span>
        </button>

        {/* Pause Button */}
        {isDownloading && (
          <button
            type="button"
            onClick={onPause}
            className="hud-button flex items-center gap-2 px-5 py-3 rounded-lg font-mono font-bold text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-cyber-neonAmber text-cyber-neonAmber transition-all shadow-[0_0_12px_rgba(255,179,0,0.3)]"
          >
            <Pause className="w-4 h-4 fill-current" />
            <span>PAUSE</span>
          </button>
        )}

        {/* Resume Button */}
        {isPaused && (
          <button
            type="button"
            onClick={onResume}
            className="hud-button flex items-center gap-2 px-5 py-3 rounded-lg font-mono font-bold text-xs bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyber-neonCyan text-cyber-neonCyan transition-all shadow-[0_0_12px_rgba(0,229,255,0.3)]"
          >
            <PlayCircle className="w-4 h-4" />
            <span>RESUME</span>
          </button>
        )}

        {/* Cancel Button */}
        {isBusy && (
          <button
            type="button"
            onClick={onCancel}
            className="hud-button flex items-center gap-2 px-5 py-3 rounded-lg font-mono font-bold text-xs bg-rose-500/20 hover:bg-rose-500/30 border border-cyber-neonRose text-cyber-neonRose transition-all shadow-[0_0_12px_rgba(255,23,68,0.3)]"
          >
            <StopCircle className="w-4 h-4" />
            <span>CANCEL</span>
          </button>
        )}

        {/* Resume Previous Session Button */}
        {!isBusy && (
          <button
            type="button"
            onClick={onResumePrevious}
            className="hud-button flex items-center gap-2 px-4 py-3 rounded-lg font-mono font-medium text-xs bg-cyber-card hover:bg-cyber-card/80 border border-cyber-border hover:border-cyber-neonAmber text-cyber-textBright transition-all"
          >
            <RotateCcw className="w-4 h-4 text-cyber-neonAmber" />
            <span>RESUME PREVIOUS</span>
          </button>
        )}
      </div>
    </div>
  );
};
