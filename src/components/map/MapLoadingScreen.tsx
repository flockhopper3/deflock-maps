import { useEffect, useState } from 'react';
import type { CameraLoadPhase } from '@/store/cameraStore';

interface MapLoadingScreenProps {
  cameraProgress: CameraLoadPhase;
  cameraCount?: number;
  error?: string | null;
  onRetry?: () => void;
  watchdogWarning?: boolean;
}

/**
 * Full-screen loading experience for the map page.
 * Shows a consistent, branded loading state while:
 * 1. Camera data fetches from network
 * 2. Spatial grid hydrates
 * 3. Map tiles prepare
 * 
 * This eliminates the jarring experience of seeing an empty map
 * before dots appear.
 */
export function MapLoadingScreen({ 
  cameraProgress, 
  cameraCount = 0, 
  error,
  onRetry,
  watchdogWarning = false,
}: MapLoadingScreenProps) {
  const [dots, setDots] = useState('');
  const [showTip, setShowTip] = useState(false);
  
  // Calculate progress percentage based on phase
  const getProgressPercent = () => {
    switch (cameraProgress) {
      case 'idle': return 10;
      case 'fetching': return 40;
      case 'hydrating': return 75;
      case 'ready': return 100;
      case 'error': return 0;
      default: return 20;
    }
  };
  
  // Get current phase label
  const getPhaseLabel = () => {
    switch (cameraProgress) {
      case 'idle': return 'Initializing';
      case 'fetching': return 'Fetching cameras';
      case 'hydrating': return 'Preparing map data';
      case 'ready': return 'Ready';
      case 'error': return 'Error';
      default: return 'Loading';
    }
  };

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Show tip after a delay
  useEffect(() => {
    const timeout = setTimeout(() => setShowTip(true), 2000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-dark-900 overflow-hidden">
      {/* Header - Same as map page for consistency */}
      <header className="h-14 lg:h-16 bg-dark-900 border-b border-dark-600 flex items-center z-50 shrink-0">
        <div className="w-full px-3 lg:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16">
            {/* Logo */}
            <a href="https://deflock.org" className="flex items-center gap-2 group">
              <img
                src="/deflock-icon.png"
                alt="DeFlock Icon"
                className="h-8 lg:h-10 w-auto object-contain transition-all duration-300 group-hover:scale-110"
              />
              <img
                src="/deflock-logo.svg"
                alt="DeFlock Logo"
                className="h-8 lg:h-10 w-auto object-contain transition-all duration-300 group-hover:scale-110"
              />
            </a>

            {/* Loading indicator in header */}
            <div className="flex items-center gap-2 bg-dark-800 rounded-full px-3 py-1.5">
              <div className="w-3 h-3 border-2 border-dark-600 border-t-accent rounded-full animate-spin"></div>
              <span className="text-sm text-dark-300">Loading{dots}</span>
            </div>

            <div className="hidden lg:flex items-center gap-4 flex-shrink-0" />
          </div>
        </div>
      </header>

      {/* Main loading content */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Animated background - subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(to right, #4DA6FF 1px, transparent 1px),
              linear-gradient(to bottom, #4DA6FF 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Radial glow effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(30,144,255,0.08) 0%, transparent 50%)',
          }}
        />

        {error ? (
          // Error state
          <div className="relative z-10 flex flex-col items-center gap-6 px-6 max-w-md text-center">
            <div className="flex items-center gap-3 opacity-50">
              <img
                src="/deflock-icon.png"
                alt="DeFlock Icon"
                className="h-16 lg:h-20 w-auto object-contain"
              />
              <img
                src="/deflock-logo.svg"
                alt="DeFlock"
                className="h-16 lg:h-20 w-auto object-contain"
              />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white mb-2">
                Failed to Load Camera Data
              </h2>
              <p className="text-dark-300 text-sm">
                {error}
              </p>
            </div>
            <button 
              onClick={onRetry}
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          // Loading state
          <div className="relative z-10 flex flex-col items-center gap-8 px-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="/deflock-icon.png"
                alt="DeFlock Icon"
                className="h-20 lg:h-24 w-auto object-contain"
              />
              <img
                src="/deflock-logo.svg"
                alt="DeFlock"
                className="h-20 lg:h-24 w-auto object-contain"
              />
            </div>

            {/* Loading spinner and text */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-dark-700 border-t-accent rounded-full animate-spin" />
              <p className="text-dark-300 text-sm">
                {getPhaseLabel()}{dots}
              </p>
            </div>

            {/* Progress indicator with stages */}
            <div className="w-72 max-w-full">
              {/* Stage indicators */}
              <div className="flex justify-between text-xs text-dark-400 mb-2">
                <span className={cameraProgress === 'fetching' ? 'text-accent' : cameraProgress === 'hydrating' || cameraProgress === 'ready' ? 'text-success' : ''}>
                  Fetch
                </span>
                <span className={cameraProgress === 'hydrating' ? 'text-accent' : cameraProgress === 'ready' ? 'text-success' : ''}>
                  Prepare
                </span>
                <span className={cameraProgress === 'ready' ? 'text-success' : ''}>
                  Ready
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${getProgressPercent()}%` }}
                />
              </div>
              
              {/* Camera count */}
              {cameraCount > 0 && (
                <p className="text-center text-xs text-dark-400 mt-2">
                  {cameraCount.toLocaleString()} cameras loaded
                </p>
              )}
            </div>

            {/* Watchdog warning */}
            {watchdogWarning && (
              <div className="mt-2 px-4 py-3 bg-amber-900/30 rounded-xl border border-amber-500/30 max-w-sm">
                <p className="text-xs text-amber-300 text-center mb-2">
                  Map source didn't initialize properly
                </p>
                <button 
                  onClick={onRetry}
                  className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading tip */}
            {showTip && !watchdogWarning && (
              <div className="mt-4 px-4 py-3 bg-dark-800/50 rounded-xl border border-dark-700/50 max-w-sm">
                <p className="text-xs text-dark-400 text-center">
                  <span className="text-accent font-medium">Did you know?</span> Over 90,000 ALPR cameras 
                  across the US perform 20 billion scans per month without requiring a warrant.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

