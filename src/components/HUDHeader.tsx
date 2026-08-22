import React from 'react';
import { Film, Activity, Cpu, HardDrive, Radio } from 'lucide-react';
import { isTauri } from '../utils/tauri';

interface HUDHeaderProps {
  ffmpegAvailable: boolean;
  activeStatus: string;
}

export const HUDHeader: React.FC<HUDHeaderProps> = ({ ffmpegAvailable, activeStatus }) => {
  const nativeMode = isTauri();

  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-cyber-border bg-cyber-surface/80 backdrop-blur-xl">
      {/* Title & Brand */}
      <div className="flex items-center gap-3">
        <div className="relative p-2.5 rounded-lg border border-cyber-border bg-cyber-card shadow-[0_0_15px_rgba(0,229,255,0.2)]">
          <Film className="w-6 h-6 text-cyber-neonCyan animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyber-neonCyan animate-ping" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-wider font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyber-neonCyan via-white to-cyber-neonAmber">
              RONGYOK HUD
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold tracking-widest text-cyber-neonCyan border border-cyber-neonCyan/40 rounded bg-cyber-neonCyan/10">
              V2.0
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider rounded border ${
              nativeMode
                ? 'text-cyber-neonGreen border-cyber-neonGreen/40 bg-cyber-neonGreen/10'
                : 'text-cyber-neonAmber border-cyber-neonAmber/40 bg-cyber-neonAmber/10'
            }`}>
              {nativeMode ? 'TAURI NATIVE' : 'WEB SANDBOX'}
            </span>
          </div>
          <p className="text-xs text-cyber-textMuted tracking-wide font-sans">
            High-Performance Stream Downloader & Concat Engine
          </p>
        </div>
      </div>

      {/* Diagnostics & Status Badges */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-cyber-border bg-cyber-card/80 text-xs font-mono">
          <Radio className={`w-3.5 h-3.5 ${nativeMode ? 'text-cyber-neonGreen animate-pulse' : 'text-cyber-neonAmber'}`} />
          <span className="text-cyber-textMuted">IPC:</span>
          <span className={nativeMode ? 'text-cyber-neonGreen font-semibold' : 'text-cyber-neonAmber font-semibold'}>
            {nativeMode ? 'CONNECTED' : 'SIMULATOR'}
          </span>
        </div>

        {/* FFmpeg status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-cyber-border bg-cyber-card/80 text-xs font-mono">
          <HardDrive className={`w-3.5 h-3.5 ${ffmpegAvailable ? 'text-cyber-neonGreen' : 'text-cyber-neonRose'}`} />
          <span className="text-cyber-textMuted">FFmpeg:</span>
          <span className={ffmpegAvailable ? 'text-cyber-neonGreen font-semibold' : 'text-cyber-neonRose font-semibold'}>
            {ffmpegAvailable ? 'ONLINE' : 'NOT FOUND'}
          </span>
        </div>

        {/* Engine status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-cyber-border bg-cyber-card/80 text-xs font-mono">
          <Cpu className="w-3.5 h-3.5 text-cyber-neonCyan" />
          <span className="text-cyber-textMuted">Engine:</span>
          <span className="text-cyber-neonCyan font-semibold">
            {nativeMode ? 'TOKIO ASYNC' : 'V8 SANDBOX'}
          </span>
        </div>

        {/* Live status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-cyber-border bg-cyber-card/80 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-cyber-neonAmber" />
          <span className="text-cyber-textMuted">Status:</span>
          <span className="text-cyber-textBright uppercase font-semibold">
            {activeStatus}
          </span>
        </div>
      </div>
    </header>
  );
};
