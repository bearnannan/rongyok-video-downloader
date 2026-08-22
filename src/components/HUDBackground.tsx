import React from 'react';

export const HUDBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Dark gradient base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0c1829] via-[#080b11] to-[#040609]" />

      {/* Cyberpunk Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 229, 255, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 229, 255, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial ambient glow orbs */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-cyber-neonCyan/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-cyber-neonPurple/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 left-1/3 w-[500px] h-64 bg-cyber-neonAmber/5 rounded-full blur-3xl" />

      {/* Sci-Fi Vignette and scanline overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(4,6,9,0.75)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(0,229,255,0.015)] to-transparent h-24 animate-scanline pointer-events-none" />
    </div>
  );
};
