import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HUDBackground } from './HUDBackground';
import { ParticlesBackground } from './ParticlesBackground';
import { HUDHeader } from './HUDHeader';
import { HeroSection } from './HeroSection';
import { FeatureBentoGrid } from './FeatureBentoGrid';
import { URLBar } from './URLBar';
import { OutputSelector } from './OutputSelector';
import { SeriesCard } from './SeriesCard';
import { EpisodeGrid } from './EpisodeGrid';
import { ProgressConsole } from './ProgressConsole';
import { ActionControls } from './ActionControls';
import { TelemetryLog } from './TelemetryLog';
import { FooterSection } from './FooterSection';
import { tauriApi } from '../utils/tauri';
import { Play } from 'lucide-react';
import type { SeriesInfo, DownloadProgressEvent, DownloadStatus, LogMessage } from '../types';

export const LandingPage: React.FC = () => {
  // State for interactive simulator
  const [url, setUrl] = useState('https://rongyok.com/watch/?series_id=8625');
  const [outputDir, setOutputDir] = useState('./downloads');
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([]);
  const [completedEpisodes, setCompletedEpisodes] = useState<number[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<number | null>(null);
  const [status, setStatus] = useState<DownloadStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('Ready for stream extraction');
  const [progress, setProgress] = useState<DownloadProgressEvent | null>(null);
  const [autoMerge, setAutoMerge] = useState(true);
  const [deleteParts, setDeleteParts] = useState(true);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const demoRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    addLog('Rongyok Video Downloader HUD v2.0 Web Showcase Initialized', 'info');
    addLog('Interactive Browser Simulator Engine Ready', 'success');

    let unlistenProgress: (() => void) | undefined;
    let unlistenLog: (() => void) | undefined;
    let unlistenStatus: (() => void) | undefined;

    tauriApi.onProgress((payload: DownloadProgressEvent) => {
      setProgress(payload);
      setCurrentEpisode(payload.episode);
      if (payload.status_message) {
        setStatusMessage(payload.status_message);
      }
      if (payload.percentage >= 100 && !completedEpisodes.includes(payload.episode)) {
        setCompletedEpisodes((prev: number[]) => [...prev, payload.episode]);
      }
    }).then((unlisten: () => void) => {
      unlistenProgress = unlisten;
    });

    tauriApi.onLog((payload: LogMessage) => {
      setLogs((prev: LogMessage[]) => [...prev, payload]);
    }).then((unlisten: () => void) => {
      unlistenLog = unlisten;
    });

    tauriApi.onStatusChange((payload: { status: string; message: string }) => {
      setStatus(payload.status as DownloadStatus);
      setStatusMessage(payload.message);
      addLog(`Status: ${payload.status.toUpperCase()} - ${payload.message}`, 'info');
    }).then((unlisten: () => void) => {
      unlistenStatus = unlisten;
    });

    return () => {
      unlistenProgress?.();
      unlistenLog?.();
      unlistenStatus?.();
    };
  }, [addLog]);

  const handleFetch = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setStatus('fetching');
    setStatusMessage('Resolving series metadata and stream index...');
    addLog(`Fetching target series URL: ${url}`, 'info');

    try {
      const data = await tauriApi.fetchSeriesInfo(url.trim());
      setSeriesInfo(data);
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

  const overallPercentage = selectedEpisodes.length > 0
    ? (completedEpisodes.filter(e => selectedEpisodes.includes(e)).length / selectedEpisodes.length) * 100
    : 0;

  return (
    <div className="relative min-h-screen flex flex-col bg-cyber-bg text-cyber-textBright">
      <HUDBackground />
      <ParticlesBackground />
      <HUDHeader ffmpegAvailable={true} activeStatus={status} />

      {/* Hero Section */}
      <HeroSection onScrollToDemo={scrollToDemo} />

      {/* Feature Bento Grid */}
      <FeatureBentoGrid />

      {/* Interactive Simulator Section */}
      <section
        ref={demoRef}
        className="relative z-10 flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto flex flex-col gap-5 scroll-mt-6"
      >
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

        <ProgressConsole
          progress={progress}
          overallPercentage={overallPercentage}
          completedCount={completedEpisodes.filter(e => selectedEpisodes.includes(e)).length}
          totalSelectedCount={selectedEpisodes.length}
          statusMessage={statusMessage}
        />

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

        <TelemetryLog
          logs={logs}
          onClear={() => setLogs([])}
        />
      </section>

      <FooterSection />
    </div>
  );
};
