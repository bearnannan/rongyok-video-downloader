import React from 'react';
import { Tv, Hash, Layers, Image as ImageIcon } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import type { SeriesInfo } from '../types';

interface SeriesCardProps {
  seriesInfo: SeriesInfo | null;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({ seriesInfo }) => {
  if (!seriesInfo) {
    return (
      <SpotlightCard className="p-6 flex flex-col items-center justify-center text-center min-h-[150px]">
        <Tv className="w-10 h-10 text-cyber-textMuted/40 mb-2" />
        <p className="text-sm text-cyber-textMuted font-mono">
          NO SERIES LOADED // PASTE A URL AND CLICK FETCH
        </p>
      </SpotlightCard>
    );
  }

  return (
    <SpotlightCard className="p-5">
      <div className="flex gap-5">
        {/* Poster preview */}
        <div className="relative w-28 h-36 rounded-lg overflow-hidden border border-cyber-border bg-cyber-bg flex-shrink-0 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.1)]">
          {seriesInfo.poster_url ? (
            <img
              src={seriesInfo.poster_url}
              alt={seriesInfo.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder on image error
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-cyber-textMuted/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-cyber-bg/90 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Series Metadata */}
        <div className="flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-cyber-neonCyan/10 border border-cyber-neonCyan/30 text-[11px] font-mono text-cyber-neonCyan">
                <Hash className="w-3 h-3" /> ID: {seriesInfo.series_id}
              </span>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-cyber-neonAmber/10 border border-cyber-neonAmber/30 text-[11px] font-mono text-cyber-neonAmber">
                <Layers className="w-3 h-3" /> {seriesInfo.total_episodes} EPISODES
              </span>
            </div>

            <h2 className="text-lg font-bold text-cyber-textBright line-clamp-2 leading-snug tracking-wide">
              {seriesInfo.title}
            </h2>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-cyber-textMuted border-t border-cyber-border/40 pt-2.5 mt-2">
            <span>READY FOR DOWNLOAD</span>
            <span className="text-cyber-neonGreen font-semibold">ALL EPISODES INDEXED</span>
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
};
