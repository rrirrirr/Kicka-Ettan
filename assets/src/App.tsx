import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import GameRoom from './pages/GameRoom';
import Demo from './pages/Demo';
import NotFound from './pages/NotFound';

// Only load DevPage in development
const DevPage = React.lazy(() => import('./pages/DevPage'));
const ButtonGuidePage = React.lazy(() => import('./pages/ButtonGuidePage'));
const ColorGuidePage = React.lazy(() => import('./pages/ColorGuidePage'));
const CollisionDemoPage = React.lazy(() => import('./pages/CollisionDemoPage'));
import { SettingsProvider } from './contexts/SettingsContext';
import { TutorialProvider } from './contexts/TutorialContext';
import { PostHogProvider } from './contexts/PostHogContext';
import { pageTransition } from './utils/animations';
import { config } from './config';

import { LoadingGame } from './components/ui/LoadingGame';


const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Main pages */}
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/game/:gameId" element={<PageWrapper><GameRoom /></PageWrapper>} />
        <Route path="/demo" element={<PageWrapper><Demo /></PageWrapper>} />

        {import.meta.env.DEV && (
          <>
            <Route path="/dev" element={
              <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <PageWrapper><DevPage /></PageWrapper>
              </Suspense>
            } />
            <Route path="/dev/buttons" element={
              <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <PageWrapper><ButtonGuidePage /></PageWrapper>
              </Suspense>
            } />
            <Route path="/dev/colors" element={
              <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <PageWrapper><ColorGuidePage /></PageWrapper>
              </Suspense>
            } />
            <Route path="/dev/collisions" element={
              <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <PageWrapper><CollisionDemoPage /></PageWrapper>
              </Suspense>
            } />
          </>
        )}
        <Route path="/loading-test" element={<PageWrapper><LoadingGame /></PageWrapper>} />
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <PostHogProvider apiKey={config.posthog.apiKey} apiHost={config.posthog.apiHost}>
      <SettingsProvider>
        <TutorialProvider>
          <Router>
            <AnimatedRoutes />
          </Router>
        </TutorialProvider>
      </SettingsProvider>
    </PostHogProvider>
  );
}

export default App;
