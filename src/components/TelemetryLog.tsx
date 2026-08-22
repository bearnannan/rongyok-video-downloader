import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Copy, Trash2, Check, Search, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';
import type { LogMessage } from '../types';

interface TelemetryLogProps {
  logs: LogMessage[];
  onClear: () => void;
}

export const TelemetryLog: React.FC<TelemetryLogProps> = ({ logs, onClear }) => {
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((log) =>
    log.text.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCopy = async () => {
    try {
      const fullText = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.text}`).join('\n');
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy logs:', err);
    }
  };

  const getLevelBadge = (level: LogMessage['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-cyber-neonRose flex-shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-cyber-neonGreen flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-cyber-neonAmber flex-shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-cyber-neonCyan flex-shrink-0" />;
    }
  };

  const getTextColor = (level: LogMessage['level']) => {
    switch (level) {
      case 'error':
        return 'text-cyber-neonRose';
      case 'success':
        return 'text-cyber-neonGreen';
      case 'warning':
        return 'text-cyber-neonAmber';
      default:
        return 'text-cyber-textBright';
    }
  };

  return (
    <SpotlightCard className="p-4 flex flex-col gap-3">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyber-neonCyan" />
          <span className="text-xs font-mono font-bold text-cyber-neonCyan uppercase tracking-wider">
            Telemetry Stream Log
          </span>
          <span className="px-1.5 py-0.2 rounded bg-cyber-card border border-cyber-border text-[10px] font-mono text-cyber-textMuted">
            {logs.length} events
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-cyber-textMuted absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-7 pr-2 py-1 bg-cyber-bg border border-cyber-border rounded text-xs font-mono text-cyber-textBright placeholder:text-cyber-textMuted/40 focus:outline-none focus:border-cyber-neonCyan w-36"
            />
          </div>

          {/* Copy logs */}
          <button
            type="button"
            onClick={handleCopy}
            className="hud-button flex items-center gap-1 px-2.5 py-1 rounded bg-cyber-card hover:bg-cyber-card/80 border border-cyber-border text-[11px] font-mono text-cyber-textBright transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-cyber-neonGreen" />
                <span>COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyber-neonCyan" />
                <span>COPY</span>
              </>
            )}
          </button>

          {/* Clear logs */}
          <button
            type="button"
            onClick={onClear}
            className="hud-button flex items-center gap-1 px-2.5 py-1 rounded bg-cyber-card hover:bg-cyber-card/80 border border-cyber-border text-[11px] font-mono text-cyber-textBright transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-cyber-neonRose" />
            <span>CLEAR</span>
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="h-44 overflow-y-auto rounded-lg border border-cyber-border/70 bg-cyber-bg/95 p-3 font-mono text-xs flex flex-col gap-1 select-text">
        {filteredLogs.length === 0 ? (
          <div className="text-cyber-textMuted/50 text-center my-auto py-4">
            NO LOG EVENTS RECORDED // ENGINE IDLE
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div key={`${log.id}-${index}`} className="flex items-start gap-2 leading-relaxed hover:bg-cyber-card/30 rounded px-1">
              <span className="text-cyber-textMuted/60 text-[11px] flex-shrink-0">
                [{log.timestamp}]
              </span>
              {getLevelBadge(log.level)}
              <span className={`break-all ${getTextColor(log.level)}`}>{log.text}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </SpotlightCard>
  );
};
