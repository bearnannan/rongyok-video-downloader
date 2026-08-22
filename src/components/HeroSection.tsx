import React from 'react';
import { Download, Play, Sparkles, Cpu, ShieldCheck, Film, Zap, ArrowRight, Code2 } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

interface HeroSectionProps {
  onScrollToDemo: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onScrollToDemo }) => {
  return (
    <section className="relative z-10 pt-10 pb-12 flex flex-col items-center text-center max-w-5xl mx-auto px-4">
      {/* Top Release Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyber-borderGlow/50 bg-cyber-surface/90 backdrop-blur-md mb-6 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
        <span className="w-2 h-2 rounded-full bg-cyber-neonCyan animate-ping" />
        <span className="text-xs font-mono font-semibold tracking-wider text-cyber-neonCyan">
          RUST + TAURI V2 ARCHITECTURE
        </span>
        <span className="text-cyber-textMuted">•</span>
        <span className="text-xs font-mono text-cyber-neonAmber font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> CYBER HUD v2.0
        </span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-sans text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyber-neonCyan leading-tight mb-5 max-w-4xl">
        Ultra-Fast Video Downloader & Concat Engine for Rongyok
      </h1>

      {/* Subtitle */}
      <p className="text-base sm:text-lg text-cyber-textMuted max-w-2xl font-sans leading-relaxed mb-8">
        Re-engineered from the ground up with <strong className="text-white font-medium">Rust</strong> & <strong className="text-white font-medium">Tauri v2</strong> for native multi-threaded stream extraction, automatic HTTP range resumption, and lossless FFmpeg episode merging.
      </p>

      {/* Call to Action Buttons */}
      <div className="flex items-center justify-center gap-3.5 flex-wrap mb-12">
        {/* Download Release CTA */}
        <a
          href="https://github.com/bearnannan/rongyok-video-downloader/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="hud-button flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-mono font-bold tracking-wider bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300 text-black shadow-[0_0_25px_rgba(0,229,255,0.45)] border border-cyber-neonCyan transition-all transform hover:-translate-y-0.5"
        >
          <Download className="w-4 h-4" />
          <span>DOWNLOAD RELEASE (.EXE)</span>
        </a>

        {/* View on GitHub CTA */}
        <a
          href="https://github.com/bearnannan/rongyok-video-downloader"
          target="_blank"
          rel="noopener noreferrer"
          className="hud-button flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-mono font-medium tracking-wide bg-cyber-card/90 hover:bg-cyber-card border border-cyber-border hover:border-cyber-neonCyan/60 text-white shadow-lg backdrop-blur-md transition-all transform hover:-translate-y-0.5"
        >
          <Code2 className="w-4 h-4 text-cyber-neonCyan" />
          <span>VIEW ON GITHUB</span>
        </a>

        {/* Live Simulator CTA */}
        <button
          type="button"
          onClick={onScrollToDemo}
          className="hud-button flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-mono font-medium tracking-wide bg-cyber-card/60 hover:bg-cyber-card/90 border border-cyber-border hover:border-cyber-neonAmber/60 text-cyber-neonAmber shadow-lg backdrop-blur-md transition-all transform hover:-translate-y-0.5"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>TRY LIVE SIMULATOR</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Feature Specs Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-4xl">
        <SpotlightCard className="p-3.5 flex flex-col items-center text-center">
          <Cpu className="w-5 h-5 text-cyber-neonCyan mb-1.5" />
          <div className="text-xs font-mono font-bold text-cyber-textBright">Rust + Tokio Engine</div>
          <div className="text-[11px] font-sans text-cyber-textMuted">Zero-overhead concurrency</div>
        </SpotlightCard>

        <SpotlightCard className="p-3.5 flex flex-col items-center text-center">
          <Zap className="w-5 h-5 text-cyber-neonAmber mb-1.5" />
          <div className="text-xs font-mono font-bold text-cyber-textBright">Dynamic API Bypass</div>
          <div className="text-[11px] font-sans text-cyber-textMuted">Live cookie & token solver</div>
        </SpotlightCard>

        <SpotlightCard className="p-3.5 flex flex-col items-center text-center">
          <ShieldCheck className="w-5 h-5 text-cyber-neonGreen mb-1.5" />
          <div className="text-xs font-mono font-bold text-cyber-textBright">HTTP Range Resume</div>
          <div className="text-[11px] font-sans text-cyber-textMuted">Zero byte data loss</div>
        </SpotlightCard>

        <SpotlightCard className="p-3.5 flex flex-col items-center text-center">
          <Film className="w-5 h-5 text-cyber-neonPurple mb-1.5" />
          <div className="text-xs font-mono font-bold text-cyber-textBright">FFmpeg Concat Demux</div>
          <div className="text-[11px] font-sans text-cyber-textMuted">Lossless stream copy</div>
        </SpotlightCard>
      </div>
    </section>
  );
};
