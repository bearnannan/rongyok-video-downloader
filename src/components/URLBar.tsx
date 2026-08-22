import React from 'react';
import { Search, ClipboardPaste, Loader2, Link2, X, Sparkles } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

interface URLBarProps {
  url: string;
  setUrl: (url: string) => void;
  onFetch: () => void;
  isLoading: boolean;
}

export const URLBar: React.FC<URLBarProps> = ({ url, setUrl, onFetch, isLoading }) => {
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && url.trim()) {
      onFetch();
    }
  };

  const setSampleUrl = () => {
    setUrl('https://rongyok.com/watch/?series_id=8625&ep=60');
  };

  return (
    <SpotlightCard className="p-4 border-cyber-borderGlow/60 shadow-[0_0_20px_rgba(0,229,255,0.15)]">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-bold text-cyber-neonCyan tracking-wider flex items-center gap-1.5 uppercase">
            <Link2 className="w-4 h-4 text-cyber-neonCyan" />
            <span>Target Series URL</span>
          </label>

          <button
            type="button"
            onClick={setSampleUrl}
            className="flex items-center gap-1 text-[11px] font-mono text-cyber-neonAmber hover:underline opacity-90 hover:opacity-100 transition-opacity"
          >
            <Sparkles className="w-3 h-3" />
            <span>Sample: Series 8625</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste Rongyok Series URL (e.g. https://rongyok.com/watch/?series_id=8625)"
              className="w-full pl-3.5 pr-9 py-2.5 bg-cyber-bg border border-cyber-border hover:border-cyber-neonCyan/50 rounded-lg text-sm text-cyber-textBright font-mono placeholder:text-cyber-textMuted/50 focus:outline-none focus:border-cyber-neonCyan focus:ring-1 focus:ring-cyber-neonCyan shadow-inner transition-all"
            />
            {url && (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyber-textMuted hover:text-white transition-colors"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Paste button */}
          <button
            type="button"
            onClick={handlePaste}
            className="hud-button flex items-center gap-1.5 px-3.5 py-2.5 bg-cyber-card hover:bg-cyber-card/80 border border-cyber-border hover:border-cyber-neonCyan/60 rounded-lg text-xs font-mono font-semibold text-cyber-textBright transition-all shadow-sm"
            title="Paste from clipboard"
          >
            <ClipboardPaste className="w-4 h-4 text-cyber-neonCyan" />
            <span>PASTE</span>
          </button>

          {/* Fetch button */}
          <button
            type="button"
            disabled={isLoading || !url.trim()}
            onClick={onFetch}
            className={`hud-button flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all ${
              isLoading || !url.trim()
                ? 'bg-cyber-card border border-cyber-border text-cyber-textMuted/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300 border border-cyber-neonCyan text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>FETCHING...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>FETCH DATA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </SpotlightCard>
  );
};
