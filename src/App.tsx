import React from 'react';
import { isTauri } from './utils/tauri';
import { DesktopApp } from './components/DesktopApp';
import { LandingPage } from './components/LandingPage';

export const App: React.FC = () => {
  // If running inside the Tauri native desktop window, render the focused Desktop HUD
  if (isTauri()) {
    return <DesktopApp />;
  }

  // If accessed via web browser / GitHub Pages, render the full Showcase Landing Page
  return <LandingPage />;
};
