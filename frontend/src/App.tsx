import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import CinematicBackground from './components/CinematicBackground'
import LoadingScreen from './components/LoadingScreen'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const GameInterface = lazy(() => import('./pages/GameInterface'))
const Settings = lazy(() => import('./pages/Settings'))
const MemoryDashboard = lazy(() => import('./pages/MemoryDashboard'))

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CinematicBackground />
      <Suspense fallback={<LoadingScreen message="Loading..." />}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen bg-transparent relative z-10"
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/game/:gameId" element={<GameInterface />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/memories" element={<MemoryDashboard />} />
          </Routes>
        </motion.div>
      </Suspense>
    </Router>
  )
}

export default App
