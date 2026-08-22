import React from 'react';
import { Cpu, Radio, ShieldCheck, Film, HardDrive, CheckCircle2 } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

export const FeatureBentoGrid: React.FC = () => {
  return (
    <section className="relative z-10 py-12 max-w-6xl mx-auto px-4">
      <div className="text-center mb-10">
        <div className="text-xs font-mono font-bold text-cyber-neonCyan tracking-widest uppercase mb-2">
          // ARCHITECTURAL CAPABILITIES
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-cyber-textBright font-sans">
          Engineered for Raw Speed & Maximum Reliability
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Rust Engine */}
        <SpotlightCard className="p-6 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2.5 rounded-lg bg-cyber-neonCyan/10 border border-cyber-neonCyan/30">
                <Cpu className="w-6 h-6 text-cyber-neonCyan" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyber-neonCyan uppercase tracking-widest">Rust & Tauri v2</span>
                <h3 className="text-lg font-bold text-cyber-textBright font-sans">Native Asynchronous Pipeline</h3>
              </div>
            </div>
            <p className="text-sm text-cyber-textMuted leading-relaxed mb-4">
              Built with Tokio async runtime and Reqwest connection pooling. Eliminates Python GIL bottlenecks, achieves up to 10x lower memory overhead, and executes directly on OS native threads.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-cyber-border/40 text-xs font-mono text-cyber-neonGreen">
            <CheckCircle2 className="w-4 h-4" />
            <span>Zero Python runtime dependencies required in standalone binary</span>
          </div>
        </SpotlightCard>

        {/* Card 2: Dynamic API Extraction */}
        <SpotlightCard className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2.5 rounded-lg bg-cyber-neonAmber/10 border border-cyber-neonAmber/30">
                <Radio className="w-6 h-6 text-cyber-neonAmber" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyber-neonAmber uppercase tracking-widest">Smart Scraper</span>
                <h3 className="text-lg font-bold text-cyber-textBright font-sans">Dynamic Stream Solver</h3>
              </div>
            </div>
            <p className="text-sm text-cyber-textMuted leading-relaxed">
              Negotiates with Rongyok's dynamic <code className="text-cyber-neonAmber font-mono text-xs">playseries.php</code> API with active session cookie persistence to extract signed Discord CDN URLs on the fly.
            </p>
          </div>
          <div className="pt-3 border-t border-cyber-border/40 text-xs font-mono text-cyber-neonCyan">
            Automated token refresh & regex fallback
          </div>
        </SpotlightCard>

        {/* Card 3: HTTP Range Resumption */}
        <SpotlightCard className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2.5 rounded-lg bg-cyber-neonGreen/10 border border-cyber-neonGreen/30">
                <ShieldCheck className="w-6 h-6 text-cyber-neonGreen" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyber-neonGreen uppercase tracking-widest">Resilience</span>
                <h3 className="text-lg font-bold text-cyber-textBright font-sans">HTTP 206 Resume</h3>
              </div>
            </div>
            <p className="text-sm text-cyber-textMuted leading-relaxed">
              Uses HTTP byte-range requests and <code className="text-cyber-neonGreen font-mono text-xs">.mp4.part</code> atomic staging. If network drops, downloads seamlessly resume from the exact byte without restarting.
            </p>
          </div>
          <div className="pt-3 border-t border-cyber-border/40 text-xs font-mono text-cyber-textBright">
            Atomic replace prevents corrupted files
          </div>
        </SpotlightCard>

        {/* Card 4: Lossless Video Concat */}
        <SpotlightCard className="p-6 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2.5 rounded-lg bg-cyber-neonPurple/10 border border-cyber-neonPurple/30">
                <Film className="w-6 h-6 text-cyber-neonPurple" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyber-neonPurple uppercase tracking-widest">FFmpeg Integration</span>
                <h3 className="text-lg font-bold text-cyber-textBright font-sans">Lossless Stream Merging (-c copy)</h3>
              </div>
            </div>
            <p className="text-sm text-cyber-textMuted leading-relaxed mb-4">
              Stitches 50-100+ separate short drama episodes into a unified full-length video file in seconds using FFmpeg's concat demuxer without any quality loss or expensive re-encoding.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-cyber-border/40 text-xs font-mono text-cyber-neonAmber">
            <HardDrive className="w-4 h-4" />
            <span>Automatic Windows path escaping & temporary parts cleanup</span>
          </div>
        </SpotlightCard>
      </div>
    </section>
  );
};
