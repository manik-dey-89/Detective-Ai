
import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus, Trophy, Target, Clock, TrendingUp, LogOut, Settings,
  Loader2, AlertCircle, XCircle, CheckCircle, Star, Users,
  FileSearch, Brain, Award, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useGameStore, usePlayer } from '../lib/store';
import { caseApi, gameApi } from '../lib/api';
import { Case } from '../types';
import { normalizeStatistics, formatPlayTime, formatAvgInvestigation } from '../lib/statistics';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const player = usePlayer();
  const {
    setPlayer, setCases, setCaseGameMap, caseGameMap,
    setLoading, setError, error, refreshPlayer,
  } = useGameStore();
  const cases = useGameStore((s) => s.cases);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [newCaseParams, setNewCaseParams] = useState({
    difficulty: 'medium',
    crimeType: 'murder',
    location: '',
  });
  const isLoadingRef = useRef(false);
  const isCreatingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef(0);

  const loadDashboardData = useCallback(async (force = false) => {
    if (!player) return;
    if (isLoadingRef.current) return;
    if (!force && Date.now() - lastFetchRef.current < 30_000 && cases.length > 0) return;

    isLoadingRef.current = true;
    setIsDashboardLoading(true);

    try {
      const [casesResponse, gamesResponse] = await Promise.all([
        caseApi.getPlayerCases(player.id),
        caseApi.getPlayerGames(player.id),
        refreshPlayer(player.id, force),
      ]);

      const loadedCases = casesResponse.data.data || [];
      const games = gamesResponse.data.data || [];
      const map: Record<string, string> = {};
      games.forEach((g: { caseId: string; gameId: string }) => {
        map[g.caseId] = g.gameId;
      });

      setCases(loadedCases);
      setCaseGameMap(map);
      lastFetchRef.current = Date.now();
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      isLoadingRef.current = false;
      setIsDashboardLoading(false);
    }
  }, [player, cases.length, refreshPlayer, setCases, setCaseGameMap]);

  useEffect(() => {
    if (player) {
      loadDashboardData(true);
    }
  }, [player?.id]);

  useEffect(() => {
    if (player && location.pathname === '/dashboard') {
      loadDashboardData(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const onFocus = () => {
      if (player) loadDashboardData(true);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [player?.id, loadDashboardData]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleCreateCase = async () => {
    if (!player || isCreatingRef.current) return;

    isCreatingRef.current = true;
    setIsCreatingCase(true);
    setError(null);

    const maxRetries = 2;
    let retryCount = 0;
    let success = false;

    while (retryCount <= maxRetries && !success) {
      setGenerationStep(retryCount > 0 ? `Generating case... (Retry ${retryCount}/${maxRetries})` : 'Generating case...');
      setLoading(true);

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const response = await caseApi.generateAndStart(
          { ...newCaseParams, playerId: player.id },
          { signal: abortRef.current.signal }
        );

        const { case: newCase, game, player: updatedPlayer } = response.data.data;

        const { setCurrentGame, setCurrentCase } = useGameStore.getState();
        setCurrentCase(newCase);
        setCurrentGame(game);
        setPlayer(updatedPlayer);
        setCases([newCase, ...cases.filter((c) => c.id !== newCase.id)]);
        setCaseGameMap({ ...caseGameMap, [newCase.id]: game.gameId });
        setShowNewCaseModal(false);
        success = true;
        navigate(`/game/${game.gameId}`);
        await loadDashboardData(true);
      } catch (err: any) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          break;
        }
        retryCount++;
        if (retryCount > maxRetries) {
          setError(err.response?.data?.error || 'Failed to create case after multiple attempts');
        } else {
          console.warn(`Case generation failed (attempt ${retryCount}/${maxRetries}), retrying...`, err);
          await new Promise((r) => setTimeout(r, 1000));
        }
      } finally {
        if (success || retryCount > maxRetries) {
          isCreatingRef.current = false;
          setIsCreatingCase(false);
          setGenerationStep('');
          setLoading(false);
        }
      }
    }
  };

  const handleOpenCase = async (gameCase: Case) => {
    if (!player) return;

    try {
      setLoading(true);
      const { setCurrentGame, setCurrentCase } = useGameStore.getState();
      setCurrentCase(gameCase);

      const existingGameId = caseGameMap[gameCase.id];
      if (existingGameId) {
        navigate(`/game/${existingGameId}`);
        return;
      }

      const gameResponse = await gameApi.start(gameCase.id, player.id);
      const game = gameResponse.data.data;
      setCurrentGame(game);
      setCaseGameMap({ ...caseGameMap, [gameCase.id]: game.gameId });
      navigate(`/game/${game.gameId}`);
    } catch (err) {
      console.error('Error opening case:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    abortRef.current?.abort();
    setPlayer(null);
    setCases([]);
    setCaseGameMap({});
    localStorage.removeItem('detective-ai-storage');
    navigate('/');
  };

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const stats = normalizeStatistics(player.statistics);

  const statCards = [
    { icon: Target, label: 'Cases Solved', value: stats.casesSolved, color: 'text-primary', bg: 'bg-primary/10' },
    { icon: FileSearch, label: 'Active Cases', value: stats.activeCases, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: XCircle, label: 'Failed Cases', value: stats.failedCases, color: 'text-danger', bg: 'bg-danger/10' },
    { icon: Trophy, label: 'Accuracy', value: `${stats.accuracyRate.toFixed(1)}%`, color: 'text-success', bg: 'bg-success/10' },
    { icon: TrendingUp, label: 'Reputation', value: stats.casesSolved > 0 ? player.reputation.points : player.reputation.points, color: 'text-accent', bg: 'bg-accent/10' },
    { icon: Star, label: 'XP', value: stats.xp, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { icon: Award, label: 'Rank', value: player.reputation.rank, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { icon: Clock, label: 'Total Play Time', value: formatPlayTime(stats.totalPlayTime), color: 'text-warning', bg: 'bg-warning/10' },
    { icon: Clock, label: 'Avg Investigation', value: formatAvgInvestigation(stats.averageInvestigationTime), color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { icon: CheckCircle, label: 'Evidence Collected', value: stats.evidenceCollected, color: 'text-green-400', bg: 'bg-green-500/10' },
    { icon: Users, label: 'Suspects Interrogated', value: stats.suspectsInterrogated, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { icon: Brain, label: 'Correct Deductions', value: stats.correctDeductions, color: 'text-success', bg: 'bg-success/10' },
  ];

  return (
    <div className="min-h-screen p-6 md:p-12">
      {error && (
        <div className="max-w-7xl mx-auto mb-6 glass-card p-4 border border-danger/30 flex items-center gap-3 text-danger">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-sm underline">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-10"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-cyan-500/30 animate-glow-cyan">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold gradient-text mb-2">
                Detective {player.name}
              </h1>
              <div className="text-textMuted text-lg flex items-center gap-2">
                <Badge className="w-5 h-5 text-accent" />
                {player.reputation.rank}
                {isDashboardLoading && <span className="ml-2 text-sm opacity-60">(syncing...)</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/settings')} className="glass-button flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </button>
            <button onClick={handleLogout} className="glass-button flex items-center gap-2 border-danger/20 hover:border-danger/40 hover:bg-danger/10 text-danger">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-7xl mx-auto mb-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + index * 0.04 }}
            className="glass-card p-5"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <p className="text-textMuted text-xs mb-1">{stat.label}</p>
            <p className="text-xl md:text-2xl font-bold truncate">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Start New Case CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="max-w-7xl mx-auto mb-10"
      >
        <button
          onClick={() => setShowNewCaseModal(true)}
          disabled={isCreatingCase}
          className={cn(
            "glass-button-primary w-full py-10 text-2xl flex items-center justify-center gap-4",
            isCreatingCase && "opacity-50 cursor-not-allowed"
          )}
        >
          <Plus className="w-8 h-8" />
          Start New Investigation
        </button>
      </motion.div>

      {/* Recent Cases */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <FileSearch className="w-7 h-7 text-primary" />
          Recent Cases
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.length === 0 ? (
            <div className="glass-card p-12 text-center col-span-full">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-surfaceLight flex items-center justify-center">
                <Trophy className="w-12 h-12 text-textMuted opacity-50" />
              </div>
              <p className="text-textMuted text-lg">No cases yet. Start your first investigation!</p>
            </div>
          ) : (
            cases.map((gameCase, index) => (
              <motion.div
                key={gameCase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.08 }}
                className="glass-card p-6 cursor-pointer hover:scale-[1.02] transition-all group"
                onClick={() => handleOpenCase(gameCase)}
              >
                <div className="flex items-center justify-between mb-5">
                  <span className={cn("px-4 py-1.5 rounded-full text-sm font-medium", getDifficultyColor(gameCase.difficulty))}>
                    {gameCase.difficulty}
                  </span>
                  <span className={cn("px-4 py-1.5 rounded-full text-sm font-medium", getStatusColor(gameCase.status))}>
                    {gameCase.status}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-primary transition-colors">
                  {gameCase.title}
                </h3>
                <p className="text-textMuted text-sm mb-6 line-clamp-2">{gameCase.description}</p>
                <div className="flex items-center justify-between text-sm text-textMuted pt-4 border-t border-white/5">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {gameCase.location}
                  </span>
                  <span>{formatDate(gameCase.date)}</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* New Case Modal */}
      <AnimatePresence>
        {showNewCaseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => !isCreatingCase && setShowNewCaseModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card p-8 md:p-10 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">New Investigation</h2>
              <p className="text-textMuted mb-8">Customize your case parameters below</p>

              {isCreatingCase && (
                <div className="mb-8 flex items-center gap-4 p-5 rounded-2xl bg-primary/10 border border-primary/30">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <div>
                    <p className="font-semibold text-white">{generationStep || 'Starting investigation...'}</p>
                    <p className="text-sm text-textMuted">This may take a few seconds</p>
                  </div>
                </div>
              )}

              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-sm text-textMuted mb-2 font-medium">Difficulty</label>
                  <select
                    value={newCaseParams.difficulty}
                    onChange={(e) => setNewCaseParams({ ...newCaseParams, difficulty: e.target.value })}
                    disabled={isCreatingCase}
                    className="glass-input w-full"
                    style={{ backgroundColor: 'rgba(18,18,26)', color: '#e2e8f0' }}
                  >
                    <option value="easy" style={{ backgroundColor: '#0c0c12', color: '#e2e8f0' }}>Easy</option>
                    <option value="medium" style={{ backgroundColor: '#0c0c12', color: '#e2e8f0' }}>Medium</option>
                    <option value="hard" style={{ backgroundColor: '#0c0c12', color: '#e2e8f0' }}>Hard</option>
                    <option value="expert" style={{ backgroundColor: '#0c0c12', color: '#e2e8f0' }}>Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-textMuted mb-2 font-medium">Crime Type</label>
                  <select
                    value={newCaseParams.crimeType}
                    onChange={(e) => setNewCaseParams({ ...newCaseParams, crimeType: e.target.value })}
                    disabled={isCreatingCase}
                    className="glass-input w-full"
                    style={{ backgroundColor: 'rgba(18,18,26)', color: '#e2e8f0' }}
                  >
                    <option value="murder" style={{ backgroundColor: '#0c0c12', color: '#e2e8f0' }}>Murder</option>
                    <option value="theft" style={{ backgroundColor: '#0c0c12', color: '#e2e8f0' }}>Theft</option>
                    <option value="fraud" style={{ backgroundColor: '#0c0c12', color: '#e2e8f0' }}>Fraud</option>
                    <option value="kidnapping" style={{ backgroundColor: '#0c0c12', color: '#e2e8f0' }}>Kidnapping</option>
                    <option value="arson" style={{ backgroundColor: '#0c0c12', color: '#e2e8f0' }}>Arson</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-textMuted mb-2 font-medium">Location (Optional)</label>
                  <input
                    type="text"
                    value={newCaseParams.location}
                    onChange={(e) => setNewCaseParams({ ...newCaseParams, location: e.target.value })}
                    disabled={isCreatingCase}
                    placeholder="e.g., Victorian London"
                    className="glass-input w-full"
                    style={{ backgroundColor: 'rgba(18,18,26)', color: '#e2e8f0' }}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => !isCreatingCase && setShowNewCaseModal(false)}
                  disabled={isCreatingCase}
                  className="glass-button flex-1 bg-surfaceLight/50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCase}
                  disabled={isCreatingCase}
                  className="glass-button-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingCase ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Start Case'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Badge({ className, children }: { className?: string, children?: React.ReactNode }) {
  return <span className={cn("inline-flex items-center", className)}>{children}</span>;
}

function MapPin({ className }: { className?: string }) {
  return <div className={className}>📍</div>;
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy': return 'bg-green-500/20 text-green-400';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400';
    case 'hard': return 'bg-orange-500/20 text-orange-400';
    case 'expert': return 'bg-red-500/20 text-red-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-primary/20 text-primary';
    case 'solved': return 'bg-success/20 text-success';
    case 'failed': return 'bg-danger/20 text-danger';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
