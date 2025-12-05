import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import GameRoom from './pages/GameRoom';
import Demo from './pages/Demo';
import NotFound from './pages/NotFound';
import { SettingsProvider } from './contexts/SettingsContext';
import { pageTransition } from './utils/animations';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
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

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/game/:gameId" element={<PageWrapper><GameRoom /></PageWrapper>} />
        <Route path="/demo" element={<PageWrapper><Demo /></PageWrapper>} />
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <SettingsProvider>
      <Router>
        <AnimatedRoutes />
      </Router>
    </SettingsProvider>
  );
}

export default App;
