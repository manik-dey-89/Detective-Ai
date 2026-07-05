
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Play, User, Plus, LogOut, Trophy, Trash2, Lock, BadgeCheck, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { playerApi } from '../lib/api';
import { useGameStore } from '../lib/store';
import type { Player } from '../types';

const Ripple = ({ x, y, onComplete }: { x: number; y: number; onComplete: () => void }) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0.7 }}
      animate={{ scale: 3.5, opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
      style={{
        position: 'absolute',
        borderRadius: '50%',
        backgroundColor: 'rgba(6, 182, 212, 0.4)',
        left: x,
        top: y,
        width: 40,
        height: 40,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    />
  );
};

export default function HomePage() {
  const navigate = useNavigate();
  const { setPlayer, setLoading, setError, player: currentPlayer, setCurrentGame, setCurrentCase } = useGameStore();
  const [view, setView] = useState<'select' | 'create'>('select');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleIdRef = useRef(0);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const response = await playerApi.getAll();
      setPlayers(response.data.data || []);
    } catch (err) {
      console.error('Failed to load players:', err);
    }
  };

  const addRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { id, x, y }]);
  };

  const removeRipple = (id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSelectPlayer = async (player: Player) => {
    setIsProcessing(true);
    setLoading(true);
    setError(null);
    try {
      setPlayer(player);
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load detective');
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`Are you sure you want to delete detective "${playerName}"? This will delete all their cases, progress, and data permanently!`)) {
      return;
    }

    setDeletingPlayerId(playerId);
    try {
      await playerApi.delete(playerId);
      if (currentPlayer?.id === playerId) {
        setPlayer(null);
        setCurrentGame(null);
        setCurrentCase(null);
      }
      await loadPlayers();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete detective');
    } finally {
      setDeletingPlayerId(null);
    }
  };

  const handleLoginOrCreate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!playerName.trim() || isProcessing) return;
    addRipple(e);

    setIsProcessing(true);
    setLoading(true);
    setError(null);

    try {
      const response = await playerApi.login(playerName);
      setPlayer(response.data.data);
      await loadPlayers();
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to login/create detective');
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setPlayer(null);
    setCurrentGame(null);
    setCurrentCase(null);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
        
        {/* Hero title */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-12 md:mb-16"
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="w-28 h-28 md:w-36 md:h-36 mx-auto mb-6 relative animate-float"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-3xl rotate-12 shadow-2xl shadow-cyan-500/30 animate-glow-cyan" />
            <div className="absolute inset-2 glass-premium rounded-2xl flex items-center justify-center">
              <Search className="w-14 h-14 md:w-18 md:h-18 text-primary" />
            </div>
          </motion.div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold mb-4 gradient-text tracking-tight">
            Detective AI
          </h1>
          <p className="text-lg md:text-xl text-textMuted max-w-2xl mx-auto leading-relaxed">
            Unravel AI-generated mysteries. Every case is unique. Every clue matters.
          </p>
        </motion.div>

        {/* Player UI */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
          className="w-full max-w-4xl"
        >
          <AnimatePresence mode="wait">
            {view === 'select' ? (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4 }}
                className="glass-card p-8 md:p-10"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">Detectives</h2>
                  {currentPlayer && (
                    <motion.button
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleLogout}
                      className="glass-button px-5 py-2.5 flex items-center gap-2 text-sm border-danger/20 hover:border-danger/40 hover:bg-danger/10 hover:shadow-lg hover:shadow-danger/10 transition-all duration-150"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </motion.button>
                  )}
                </div>

                {players.length > 0 ? (
                  <div className="mb-8 space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                    {players.map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + index * 0.08 }}
                        whileHover={{ y: -3, scale: 1.01 }}
                        className={cn(
                          "gradient-border p-0.5 transition-all duration-150",
                          currentPlayer?.id === player.id ? "ring-2 ring-primary/30 shadow-lg shadow-primary/10" : "hover:shadow-lg hover:shadow-cyan-500/10"
                        )}
                      >
                        <div className={cn(
                          "glass-premium rounded-[22px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-150",
                          currentPlayer?.id === player.id ? "bg-gradient-to-r from-primary/15 to-accent/15" : ""
                        )}>
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg shadow-cyan-500/30">
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-semibold text-white mb-1">{player.name}</h3>
                              <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                                  <BadgeCheck className="w-3 h-3" />
                                  {player.reputation.rank}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-surfaceLight text-textMuted text-xs flex items-center gap-1">
                                  <Trophy className="w-3 h-3" />
                                  {player.statistics.casesSolved}/{player.statistics.casesAttempted} Cases
                                </span>
                                <span className="px-3 py-1 rounded-full bg-surfaceLight text-textMuted text-xs">
                                  {player.statistics.accuracyRate}% Accuracy
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 w-full md:w-auto">
                            <motion.button
                              whileHover={{ scale: 1.05, y: -1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleSelectPlayer(player)}
                              disabled={isProcessing || deletingPlayerId === player.id}
                              className="glass-button-primary flex-1 md:flex-none flex items-center justify-center gap-2 transition-all duration-150 relative overflow-hidden"
                            >
                              {ripples.filter((r) => r.id % 2 === 0).map((ripple) => (
                                <Ripple
                                  key={ripple.id}
                                  x={ripple.x}
                                  y={ripple.y}
                                  onComplete={() => removeRipple(ripple.id)}
                                />
                              ))}
                              <Play className="w-4 h-4 fill-current" />
                              Play
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05, y: -1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDeletePlayer(player.id, player.name)}
                              disabled={isProcessing || deletingPlayerId === player.id}
                              className="glass-button px-4 py-3 border-danger/20 hover:border-danger/40 hover:bg-danger/10 text-danger hover:shadow-lg hover:shadow-danger/10 transition-all duration-150"
                            >
                              {deletingPlayerId === player.id ? (
                                <span className="animate-pulse">...</span>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-textMuted mb-8">
                    <User className="w-20 h-20 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No detectives yet. Create your first one to begin your investigation!</p>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView('create')}
                  className="glass-button-primary w-full flex items-center justify-center gap-2 text-lg transition-all duration-150 relative overflow-hidden"
                  disabled={isProcessing}
                >
                  {ripples.filter((r) => r.id % 2 !== 0).map((ripple) => (
                    <Ripple
                      key={ripple.id}
                      x={ripple.x}
                      y={ripple.y}
                      onComplete={() => removeRipple(ripple.id)}
                    />
                  ))}
                  <Plus className="w-5 h-5" />
                  Create New Detective
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="create"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="glass-card p-8 md:p-12"
              >
                <div className="text-center mb-10">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-evidence/20 to-orange-500/20 flex items-center justify-center border border-evidence/30 animate-glow-evidence">
                    <Lock className="w-10 h-10 text-evidence" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Create New Detective</h2>
                  <p className="text-textMuted">Enter your detective's name to begin solving cases</p>
                </div>
                
                <div className="mb-8">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isProcessing && {}}
                    placeholder="Detective Name"
                    className="glass-input w-full text-xl text-center"
                    disabled={isProcessing}
                    autoFocus
                  />
                </div>

                <div className="space-y-4">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLoginOrCreate}
                    disabled={!playerName.trim() || isProcessing}
                    className={cn(
                      "glass-button-primary w-full flex items-center justify-center gap-2 text-xl transition-all duration-150 relative overflow-hidden",
                      (!playerName.trim() || isProcessing) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {ripples.map((ripple) => (
                      <Ripple
                        key={ripple.id}
                        x={ripple.x}
                        y={ripple.y}
                        onComplete={() => removeRipple(ripple.id)}
                      />
                    ))}
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        Start Investigation
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setView('select');
                      setPlayerName('');
                    }}
                    className="glass-button w-full flex items-center justify-center gap-2 bg-surfaceLight/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-150"
                    disabled={isProcessing}
                  >
                    Back to Selection
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl"
        >
          {[
            { icon: Search, title: 'AI-Generated Cases', desc: 'Unique, procedurally generated mysteries every time' },
            { icon: Trophy, title: 'Career Progression', desc: 'Track your detective rank, stats, and achievements' },
            { icon: MapPin, title: 'Deep Investigations', desc: 'Interrogate suspects, analyze evidence, solve crimes' },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + index * 0.15 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="glass-card p-6 text-center hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-150"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
              <p className="text-textMuted text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
