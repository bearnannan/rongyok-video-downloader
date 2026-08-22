import React from 'react';
import { FolderOpen, FolderCheck } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import { tauriApi } from '../utils/tauri';

interface OutputSelectorProps {
  outputDir: string;
  setOutputDir: (dir: string) => void;
}

export const OutputSelector: React.FC<OutputSelectorProps> = ({ outputDir, setOutputDir }) => {
  const handleBrowse = async () => {
    try {
      const selected = await tauriApi.selectDirectory(outputDir);
      if (selected) {
        setOutputDir(selected);
      }
    } catch (err) {
      console.error('Error selecting directory:', err);
    }
  };

  return (
    <SpotlightCard className="p-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono font-medium text-cyber-neonCyan tracking-wider flex items-center gap-1.5 uppercase">
          <FolderCheck className="w-3.5 h-3.5" />
          Output Storage Directory
        </label>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={outputDir}
            onChange={(e) => setOutputDir(e.target.value)}
            className="flex-1 px-3.5 py-2.5 bg-cyber-bg/90 border border-cyber-border rounded-lg text-sm text-cyber-textBright font-mono placeholder:text-cyber-textMuted/40 focus:outline-none focus:border-cyber-neonCyan focus:ring-1 focus:ring-cyber-neonCyan/50 transition-all"
          />

          <button
            type="button"
            onClick={handleBrowse}
            className="hud-button flex items-center gap-1.5 px-4 py-2.5 bg-cyber-card hover:bg-cyber-card/80 border border-cyber-border hover:border-cyber-neonCyan/50 rounded-lg text-xs font-mono font-medium text-cyber-textBright transition-all"
          >
            <FolderOpen className="w-4 h-4 text-cyber-neonAmber" />
            <span>BROWSE</span>
          </button>
        </div>
      </div>
    </SpotlightCard>
  );
};
