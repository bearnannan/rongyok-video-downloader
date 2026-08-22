import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HUDBackground } from './components/HUDBackground';
import { ParticlesBackground } from './components/ParticlesBackground';
import { HUDHeader } from './components/HUDHeader';
import { HeroSection } from './components/HeroSection';
import { FeatureBentoGrid } from './components/FeatureBentoGrid';
import { URLBar } from './components/URLBar';
import { OutputSelector } from './components/OutputSelector';
import { SeriesCard } from './components/SeriesCard';
import { EpisodeGrid } from './components/EpisodeGrid';
import { ProgressConsole } from './components/ProgressConsole';
import { ActionControls } from './components/ActionControls';
import { TelemetryLog } from './components/TelemetryLog';
import { FooterSection } from './components/FooterSection';
import { tauriApi, isTauri } from './utils/tauri';
import { Play, Sparkles, Layout } from 'lucide-react';
import type { SeriesInfo, DownloadProgressEvent, DownloadStatus, LogMessage } from './types';

export const App: React.FC = () => {
  // State
  const [url, setUrl] = useState('');
  const [outputDir, setOutputDir] = useState('./output');
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
  const [completedEpisodes, setCompletedEpisodes] = useState<number[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<number | null>(null);
  const [status, setStatus] = useState<DownloadStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('System ready for stream extraction');
  const [progress, setProgress] = useState<DownloadProgressEvent | null>(null);
  const [autoMerge, setAutoMerge] = useState(true);
  const [deleteParts, setDeleteParts] = useState(true);
  const [ffmpegAvailable, setFfmpegAvailable] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [compactMode, setCompactMode] = useState(isTauri());

  const demoRef = useRef<HTMLDivElement>(null);

  // Append Log helper
  const addLog = useCallback((text: string, level: LogMessage['level'] = 'info') => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];
    const newLog: LogMessage = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp,
      level,
      text,
    };
    setLogs((prev) => [...prev, newLog]);
  }, []);

  // Initialize diagnostics on startup
  useEffect(() => {
    addLog('Rongyok Video Downloader HUD v2.0 Initialized', 'info');
    if (isTauri()) {
      addLog('Tauri v2 Native IPC Bridge Connected', 'success');
    } else {
      addLog('Browser Sandbox Mode (Interactive Simulation Ready)', 'info');
    }

    // Check FFmpeg
    tauriApi.checkFfmpeg()
      .then((res) => {
        setFfmpegAvailable(res.available);
        if (res.available) {
          addLog(`FFmpeg detected: ${res.path || 'System PATH'}`, 'success');
        } else {
          addLog('FFmpeg not found. Video merging will be disabled unless installed.', 'warning');
        }
      })
      .catch((err) => {
        console.warn('FFmpeg check error:', err);
      });

    // Listen for progress events
    let unlistenProgress: (() => void) | undefined;
    let unlistenLog: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;

    tauriApi.onProgress((payload) => {
      setProgress(payload);
      setCurrentEpisode(payload.episode);
      if (payload.status_message) {
        setStatusMessage(payload.status_message);
      }
      if (payload.percentage >= 100 && !completedEpisodes.includes(payload.episode)) {
        setCompletedEpisodes((prev) => [...prev, payload.episode]);
      }
    }).then((unlisten) => {
      unlistenProgress = unlisten;
    });

    tauriApi.onLog((payload) => {
      setLogs((prev) => [...prev, payload]);
    }).then((unlisten) => {
      unlistenLog = unlisten;
    });

    tauriApi.onStatusChange((payload) => {
      setStatus(payload.status as DownloadStatus);
      setStatusMessage(payload.message);
      addLog(`Status: ${payload.status.toUpperCase()} - ${payload.message}`, 'info');
    }).then((unlisten) => {
      unlistenStatus = unlisten;
    });

    return () => {
      unlistenProgress?.();
      unlistenLog?.();
      unlistenStatus?.();
    };
  }, [addLog]);

  // Fetch Series Info Handler
  const handleFetch = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setStatus('fetching');
    setStatusMessage('Resolving series metadata and stream index...');
    addLog(`Fetching target series URL: ${url}`, 'info');

    try {
      const data = await tauriApi.fetchSeriesInfo(url.trim());
      setSeriesInfo(data);
      // Select all episodes by default
      const allEps = Array.from({ length: data.total_episodes }, (_, i) => i + 1);
      setSelectedEpisodes(allEps);
      setCompletedEpisodes([]);
      setCurrentEpisode(null);
      setProgress(null);
      setStatus('idle');
      setStatusMessage(`Series indexed: "${data.title}" (${data.total_episodes} Episodes)`);
      addLog(`Successfully loaded series "${data.title}" with ${data.total_episodes} episodes.`, 'success');
    } catch (err: any) {
      const errorMsg = typeof err === 'string' ? err : err?.message || 'Failed to fetch series info';
      setStatus('error');
      setStatusMessage(`Error: ${errorMsg}`);
      addLog(`Error fetching series info: ${errorMsg}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Episode Selection Helpers
  const handleToggleEpisode = (epNum: number) => {
    setSelectedEpisodes((prev) =>
      prev.includes(epNum) ? prev.filter((e) => e !== epNum) : [...prev, epNum].sort((a, b) => a - b)
    );
  };

  const handleSelectAll = () => {
    if (!seriesInfo) return;
    const all = Array.from({ length: seriesInfo.total_episodes }, (_, i) => i + 1);
    setSelectedEpisodes(all);
  };

  const handleDeselectAll = () => {
    setSelectedEpisodes([]);
  };

  const handleSelectRange = (start: number, end: number) => {
    const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    setSelectedEpisodes((prev) => Array.from(new Set([...prev, ...range])).sort((a, b) => a - b));
  };

  // Action Handlers
  const handleDownload = async () => {
    if (!seriesInfo || selectedEpisodes.length === 0) return;

    setStatus('downloading');
    setStatusMessage('Initializing multi-threaded download engine...');
    addLog(`Starting download queue for ${selectedEpisodes.length} episodes to ${outputDir}`, 'info');

    try {
      await tauriApi.startDownload(
        seriesInfo.series_id,
        seriesInfo.title,
        selectedEpisodes,
        outputDir,
        autoMerge,
        deleteParts
      );
    } catch (err: any) {
      const errorMsg = typeof err === 'string' ? err : err?.message || 'Download failed';
      setStatus('error');
      setStatusMessage(`Download error: ${errorMsg}`);
      addLog(`Download error: ${errorMsg}`, 'error');
    }
  };

  const handlePause = async () => {
    try {
      await tauriApi.pauseDownload();
      setStatus('paused');
      setStatusMessage('Download stream paused');
      addLog('Download paused by operator', 'warning');
    } catch (err: any) {
      addLog(`Pause error: ${err}`, 'error');
    }
  };

  const handleResume = async () => {
    try {
      await tauriApi.resumeDownload();
      setStatus('downloading');
      setStatusMessage('Resuming stream download...');
      addLog('Download stream resumed', 'info');
    } catch (err: any) {
      addLog(`Resume error: ${err}`, 'error');
    }
  };

  const handleCancel = async () => {
    try {
      await tauriApi.cancelDownload();
      setStatus('cancelled');
      setStatusMessage('Download operation aborted');
      addLog('Download operation cancelled by operator', 'warning');
    } catch (err: any) {
      addLog(`Cancel error: ${err}`, 'error');
    }
  };

  const handleResumePrevious = async () => {
    try {
      addLog(`Scanning previous session state in ${outputDir}...`, 'info');
      const prevState = await tauriApi.loadPreviousState(outputDir);
      if (prevState) {
        setOutputDir(prevState.output_dir);
        setUrl(`https://rongyok.com/watch/?series_id=${prevState.series_id}`);
        setCompletedEpisodes(prevState.completed_episodes);
        setSelectedEpisodes(prevState.selected_episodes);

        // Fetch fresh metadata
        const data = await tauriApi.fetchSeriesInfo(`https://rongyok.com/watch/?series_id=${prevState.series_id}`);
        setSeriesInfo(data);

        addLog(`Loaded previous session: "${prevState.series_title}" (${prevState.completed_episodes.length}/${prevState.selected_episodes.length} completed)`, 'success');
        setStatusMessage(`Restored previous session: ${prevState.series_title}`);
      } else {
        addLog('No previous download state found in selected output directory', 'warning');
      }
    } catch (err: any) {
      addLog(`Error loading previous session: ${err}`, 'error');
    }
  };

  const scrollToDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Overall progress calculation
  const overallPercentage = selectedEpisodes.length > 0
    ? (completedEpisodes.filter(e => selectedEpisodes.includes(e)).length / selectedEpisodes.length) * 100
    : 0;

  return (
    <div className="relative min-h-screen flex flex-col bg-cyber-bg text-cyber-textBright">
      {/* Ambient Sci-Fi HUD Background */}
      <HUDBackground />

      {/* Animated Particles Backdrop (React Bits) */}
      <ParticlesBackground />

      {/* Top Header & Navigation Bar */}
      <HUDHeader ffmpegAvailable={ffmpegAvailable} activeStatus={status} />

      {/* Mode View Switcher (for Web mode) */}
      {!isTauri() && (
        <div className="relative z-20 flex justify-center py-2 bg-cyber-bg/60 border-b border-cyber-border/40 backdrop-blur-md">
          <div className="flex items-center gap-1.5 p-1 bg-cyber-card rounded-lg border border-cyber-border">
            <button
              type="button"
              onClick={() => setCompactMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all ${
                !compactMode
                  ? 'bg-cyber-neonCyan/20 text-cyber-neonCyan border border-cyber-neonCyan/40 font-bold'
                  : 'text-cyber-textMuted hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>SHOWCASE LANDING</span>
            </button>
            <button
              type="button"
              onClick={() => setCompactMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-all ${
                compactMode
                  ? 'bg-cyber-neonCyan/20 text-cyber-neonCyan border border-cyber-neonCyan/40 font-bold'
                  : 'text-cyber-textMuted hover:text-white'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>COMPACT HUD APP</span>
            </button>
          </div>
        </div>
      )}

      {/* Full Landing Page Hero & Features (when not in compact mode) */}
      {!compactMode && (
        <>
          <HeroSection onScrollToDemo={scrollToDemo} />
          <FeatureBentoGrid />
        </>
      )}

      {/* Interactive HUD Simulator / Native App Container */}
      <section
        ref={demoRef}
        className="relative z-10 flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto flex flex-col gap-5 scroll-mt-6"
      >
        {!compactMode && (
          <div className="flex items-center justify-between border-b border-cyber-border pb-3 pt-4">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-cyber-neonCyan fill-current" />
              <h2 className="text-xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyber-neonCyan to-white">
                LIVE INTERACTIVE HUD ENGINE
              </h2>
            </div>
            <span className="text-xs font-mono text-cyber-neonAmber border border-cyber-neonAmber/30 px-2 py-0.5 rounded bg-cyber-neonAmber/10">
              Interactive Simulator
            </span>
          </div>
        )}

        {/* Top Controls: URL & Output Directory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <URLBar
            url={url}
            setUrl={setUrl}
            onFetch={handleFetch}
            isLoading={isLoading}
          />
          <OutputSelector
            outputDir={outputDir}
            setOutputDir={setOutputDir}
          />
        </div>

        {/* Series Metadata & Episode Selection Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <SeriesCard seriesInfo={seriesInfo} />
          </div>
          <div className="lg:col-span-2">
            <EpisodeGrid
              totalEpisodes={seriesInfo?.total_episodes || 0}
              selectedEpisodes={selectedEpisodes}
              completedEpisodes={completedEpisodes}
              currentEpisode={currentEpisode}
              onToggleEpisode={handleToggleEpisode}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onSelectRange={handleSelectRange}
              disabled={status === 'downloading' || status === 'paused'}
            />
          </div>
        </div>

        {/* Real-time Telemetry Progress Console */}
        <ProgressConsole
          progress={progress}
          overallPercentage={overallPercentage}
          completedCount={completedEpisodes.filter(e => selectedEpisodes.includes(e)).length}
          totalSelectedCount={selectedEpisodes.length}
          statusMessage={statusMessage}
        />

        {/* Action Controls */}
        <ActionControls
          status={status}
          autoMerge={autoMerge}
          setAutoMerge={setAutoMerge}
          deleteParts={deleteParts}
          setDeleteParts={setDeleteParts}
          hasSeries={!!seriesInfo}
          hasSelectedEpisodes={selectedEpisodes.length > 0}
          onDownload={handleDownload}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
          onResumePrevious={handleResumePrevious}
        />

        {/* Terminal Telemetry Log */}
        <TelemetryLog
          logs={logs}
          onClear={() => setLogs([])}
        />
      </section>

      {/* Footer Section */}
      <FooterSection />
    </div>
  );
};
