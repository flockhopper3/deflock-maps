import { StrictMode, Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/common';
import { useCameraStore } from './store/cameraStore';
import './index.css';

// Polyfill for Safari (doesn't support requestIdleCallback)
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  window.requestIdleCallback = (callback: IdleRequestCallback): number => {
    const start = Date.now();
    return window.setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1) as unknown as number;
  };
  window.cancelIdleCallback = (id: number) => clearTimeout(id);
}

// Lazy load pages for code splitting
const MapPage = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

function PageLoader() {
  return (
    <div className="h-screen w-screen flex flex-col bg-dark-900 overflow-hidden">
      <header className="h-14 lg:h-16 bg-dark-900 border-b border-dark-600 flex items-center z-50 shrink-0">
        <div className="w-full px-3 lg:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16">
            <div className="h-8 lg:h-10 w-32 bg-dark-700 rounded animate-pulse" />
            <div className="h-8 w-24 bg-dark-700 rounded animate-pulse" />
          </div>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center relative">
        <div className="relative z-10 flex flex-col items-center gap-6">
          <img
            src="/deflock-logo.svg"
            alt="Loading"
            className="h-16 lg:h-20 w-auto object-contain"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-dark-700 border-t-blue-400 rounded-full animate-spin" />
            <span className="text-dark-400 text-sm font-display">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PreloadManager - Starts camera data fetch in the background.
 * Uses requestIdleCallback to avoid blocking user interactions.
 */
function PreloadManager() {
  const preloadCameras = useCameraStore((state) => state.preloadCameras);
  const isInitialized = useCameraStore((state) => state.isInitialized);

  useEffect(() => {
    if (!isInitialized) {
      const idleId = requestIdleCallback(() => {
        preloadCameras();
      }, { timeout: 100 });
      return () => cancelIdleCallback(idleId);
    }
  }, [isInitialized, preloadCameras]);

  useEffect(() => {
    if (!document.querySelector('link[href="/cameras-us.json"]')) {
      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.href = '/cameras-us.json';
      prefetchLink.as = 'fetch';
      prefetchLink.crossOrigin = 'anonymous';
      document.head.appendChild(prefetchLink);
    }
  }, []);

  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <PreloadManager />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<MapPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/explore" element={<MapPage />} />
              <Route path="/timeline" element={<MapPage />} />
              <Route path="/analysis" element={<MapPage />} />
              <Route path="/network" element={<MapPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);
