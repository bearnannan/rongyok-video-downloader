import React from 'react';
import { isTauri } from './utils/tauri';
import { DesktopApp } from './components/DesktopApp';
import { LandingPage } from './components/LandingPage';

export const App: React.FC = () => {
  // Check if landing showcase mode is explicitly requested (via Vite mode or URL query param ?view=landing)
  const isLandingMode =
    import.meta.env.VITE_APP_MODE === 'landing' ||
    (typeof window !== 'undefined' && window.location.search.includes('view=landing'));

  // If in web showcase mode AND NOT in native Tauri -> Render Landing Page
  if (isLandingMode && !isTauri()) {
    return <LandingPage />;
  }

  // Default: Always render the main Downloader Desktop App interface directly
  return <DesktopApp />;
};
