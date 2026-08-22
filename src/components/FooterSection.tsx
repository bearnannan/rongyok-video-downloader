import React from 'react';
import { Code2, Sparkles, ExternalLink } from 'lucide-react';

export const FooterSection: React.FC = () => {
  return (
    <footer className="relative z-10 border-t border-cyber-border bg-cyber-bg/90 backdrop-blur-xl py-10 mt-16">
      <div className="max-w-6xl mx-auto px-4 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="text-sm font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyber-neonCyan to-white">
                RONGYOK VIDEO DOWNLOADER HUD
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyber-neonCyan/10 border border-cyber-neonCyan/30 text-[10px] font-mono text-cyber-neonCyan">
                v2.0
              </span>
            </div>
            <p className="text-xs text-cyber-textMuted font-sans max-w-md">
              High-Performance Stream Downloader & Concat Engine for rongyok.com.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/bearnannan/rongyok-video-downloader"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyber-border hover:border-cyber-neonCyan bg-cyber-card text-xs font-mono text-cyber-textBright transition-all"
            >
              <Code2 className="w-3.5 h-3.5 text-cyber-neonCyan" />
              <span>GitHub Repo</span>
              <ExternalLink className="w-3 h-3 text-cyber-textMuted" />
            </a>

            <a
              href="https://github.com/bearnannan/rongyok-video-downloader/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyber-border hover:border-cyber-neonAmber bg-cyber-card text-xs font-mono text-cyber-neonAmber transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Releases</span>
            </a>
          </div>
        </div>

        {/* Attribution notice */}
        <div className="pt-4 border-t border-cyber-border/40 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] font-sans text-cyber-textMuted">
          <div className="flex items-center gap-1">
            <span>Refactored & maintained by</span>
            <strong className="text-cyber-textBright">bearnannan</strong>
            <span>• Based on original work by</span>
            <a
              href="https://github.com/TheerasakPing/rongyok-video-downloader.git"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyber-neonCyan hover:underline inline-flex items-center gap-0.5"
            >
              TheerasakPing
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <div className="flex items-center gap-3">
            <span>MIT License</span>
            <span>•</span>
            <span>Made for high-performance automation</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
