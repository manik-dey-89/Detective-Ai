import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, MessageSquare, FileText, Network, Map,
  Save, Lightbulb, ArrowLeft, Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useGameStore, useCurrentGame, useCurrentCase } from '../lib/store';
import { gameApi, caseApi } from '../lib/api';
import { InterrogationMessage, InvestigationStatus, AccusationResult, ContextualHint } from '../types';
import CrimeBoard from '../components/CrimeBoard';
import AccusationPanel from '../components/AccusationPanel';
import InvestigationHints from '../components/InvestigationHints';

const PLAY_TIME_INTERVAL_SEC = 15;

export default function GameInterface() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const currentGame = useCurrentGame();
  const currentCase = useCurrentCase();
  const setCurrentGame = useGameStore((s) => s.setCurrentGame);
  const setCurrentCase = useGameStore((s) => s.setCurrentCase);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const setError = useGameStore((s) => s.setError);
  const [activeTab, setActiveTab] = useState<'investigation' | 'interrogation' | 'board' | 'evidence' | 'timeline'>('investigation');
  const [selectedNPC, setSelectedNPC] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [approach, setApproach] = useState<'neutral' | 'aggressive' | 'empathetic'>('neutral');
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [accusationResult, setAccusationResult] = useState<AccusationResult | null>(null);
  const [investigationStatus, setInvestigationStatus] = useState<InvestigationStatus | null>(null);
  const [selectedAccusationSuspect, setSelectedAccusationSuspect] = useState<string | null>(null);
  const [isSubmittingAccusation, setIsSubmittingAccusation] = useState(false);
  const [activeHints, setActiveHints] = useState<ContextualHint[]>([]);
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const [isLoadingGame, setIsLoadingGame] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const loadedGameIdRef = useRef<string | null>(null);
  const playTimeRef = useRef<number>(0);

  const refreshInvestigationStatus = useCallback(async () => {
    if (!gameId) return;
    try {
      const response = await gameApi.getInvestigationStatus(gameId);
      setInvestigationStatus(response.data.data);
    } catch (error) {
      console.error('Failed to load investigation status:', error);
    }
  }, [gameId]);

  const addHint = useCallback((hint: ContextualHint | null | undefined) => {
    if (!hint) return;
    setActiveHints(prev => {
      if (prev.some(h => h.id === hint.id)) return prev;
      return [...prev, hint];
    });
  }, []);

  const loadGameState = useCallback(async (force = false) => {
    if (!gameId) return;

    if (
      !force &&
      loadedGameIdRef.current === gameId &&
      currentGame?.gameId === gameId &&
      currentCase?.id === currentGame.caseId
    ) {
      return;
    }

    setIsLoadingGame(true);
    try {
      const gameResponse = await gameApi.getState(gameId);
      const gameState = gameResponse.data.data;
      setCurrentGame(gameState);
      playTimeRef.current = gameState.playTime;

      if (!currentCase || currentCase.id !== gameState.caseId || force) {
        const caseResponse = await caseApi.get(gameState.caseId);
        setCurrentCase(caseResponse.data.data);
      }

      loadedGameIdRef.current = gameId;
      await refreshInvestigationStatus();
    } catch (error) {
      console.error('Failed to load game state:', error);
      setError('Failed to load game');
    } finally {
      setIsLoadingGame(false);
    }
  }, [gameId, currentGame?.gameId, currentGame?.caseId, currentCase?.id, setCurrentGame, setCurrentCase, setError, refreshInvestigationStatus]);

  useEffect(() => {
    if (gameId) loadGameState();
  }, [gameId]);

  useEffect(() => {
    if (activeTab === 'timeline' && currentGame && (currentGame.timelineProgress ?? 0) < 1) {
      gameApi.markTimelineReviewed(currentGame.gameId).then(res => {
        const data = res.data.data;
        if (data.gameState) setCurrentGame(data.gameState);
        addHint(data.contextualHint);
        refreshInvestigationStatus();
      }).catch(console.error);
    }
  }, [activeTab, currentGame?.gameId]);

  useEffect(() => {
    if (!currentGame || currentGame.phase === 'conclusion') return;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      gameApi.incrementPlayTime(currentGame.gameId, PLAY_TIME_INTERVAL_SEC).catch(() => {});
      playTimeRef.current += PLAY_TIME_INTERVAL_SEC;
    };

    const interval = window.setInterval(tick, PLAY_TIME_INTERVAL_SEC * 1000);
    return () => clearInterval(interval);
  }, [currentGame?.gameId, currentGame?.phase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentGame?.interrogationHistory, selectedNPC]);

  const selectedNpcDialogue: InterrogationMessage[] =
    selectedNPC && currentGame?.interrogationHistory
      ? currentGame.interrogationHistory[selectedNPC] || []
      : [];

  const selectedNpcData = selectedNPC && currentCase
    ? [...currentCase.suspects, ...currentCase.witnesses].find(n => n.id === selectedNPC)
    : null;

  const handleInterview = async () => {
    if (!selectedNPC || !question.trim() || !currentGame || isInterviewing) return;

    setIsInterviewing(true);
    const maxRetries = 2;
    let retryCount = 0;
    let success = false;

    while (retryCount <= maxRetries && !success) {
      try {
        const response = await gameApi.interviewNPC(
          currentGame.gameId,
          selectedNPC,
          question,
          approach,
          selectedEvidence || undefined
        );
        const data = response.data.data;
        if (data.gameState) setCurrentGame(data.gameState);
        if (data.player) {
          setPlayer(data.player);
          // Refresh dashboard stats in background
          useGameStore.getState().refreshPlayer(data.player.id, true);
        }
        addHint(data.contextualHint);
        setQuestion('');
        await refreshInvestigationStatus();
        success = true;
      } catch (error: any) {
        console.error(`Failed to interview NPC (attempt ${retryCount + 1}):`, error);
        retryCount++;
        if (retryCount > maxRetries) {
          setError(error.response?.data?.error || 'Failed to get a response. Please try again.');
        } else {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    setIsInterviewing(false);
  };

  const handleSelectNPC = (npcId: string) => {
    setSelectedNPC(npcId);
    setSelectedEvidence(null);
  };

  const handleDiscoverClue = async (clueId: string) => {
    if (!currentGame) return;
    try {
      const response = await gameApi.discoverClue(currentGame.gameId, clueId);
      const data = response.data.data;
      if (data.gameState) setCurrentGame(data.gameState);
      if (data.player) {
        setPlayer(data.player);
        useGameStore.getState().refreshPlayer(data.player.id, true);
      }
      await refreshInvestigationStatus();
    } catch (error) {
      console.error('Failed to discover clue:', error);
    }
  };

  const handleCollectEvidence = async (evidenceId: string) => {
    if (!currentGame) return;
    try {
      const response = await gameApi.collectEvidence(currentGame.gameId, evidenceId);
      const data = response.data.data;
      if (data.gameState) setCurrentGame(data.gameState);
      if (data.player) {
        setPlayer(data.player);
        useGameStore.getState().refreshPlayer(data.player.id, true);
      }
      addHint(data.contextualHint);
      await refreshInvestigationStatus();
    } catch (error) {
      console.error('Failed to collect evidence:', error);
    }
  };

  const handleGetHint = async () => {
    if (!currentGame || isRequestingHint) return;
    setIsRequestingHint(true);
    try {
      const response = await gameApi.requestHint(currentGame.gameId, 'manual');
      const data = response.data.data;
      if (data.gameState) setCurrentGame(data.gameState);
      addHint(data.hint);
    } catch (error) {
      console.error('Failed to get hint:', error);
    } finally {
      setIsRequestingHint(false);
    }
  };

  const handleSave = async () => {
    if (!currentGame) return;
    try {
      await gameApi.autoSave(currentGame.gameId);
      alert('Investigation saved!');
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  };

  const handleSubmitAccusation = async () => {
    if (!currentGame || !selectedAccusationSuspect || isSubmittingAccusation) return;

    const suspect = currentCase?.suspects.find(s => s.id === selectedAccusationSuspect);
    if (!confirm(`Submit formal accusation against ${suspect?.name}?`)) return;

    setIsSubmittingAccusation(true);
    try {
      const response = await gameApi.makeAccusation(currentGame.gameId, selectedAccusationSuspect);
      const data = response.data.data;

      setAccusationResult({
        correct: data.correct,
        caseClosed: data.caseClosed,
        canRetry: data.canRetry,
        explanation: data.explanation,
        clueBreakdown: data.clueBreakdown || [],
        missedClues: data.missedClues,
        score: data.score,
        ending: data.ending,
        wrongAccusations: data.wrongAccusations,
      });

      if (data.gameState) setCurrentGame(data.gameState);
      if (data.player) {
        setPlayer(data.player);
        useGameStore.getState().refreshPlayer(data.player.id, true);
      }

      if (data.correct || data.caseClosed) {
        setCurrentCase({
          ...currentCase!,
          status: data.correct ? 'solved' : 'failed',
        });
      } else {
        setSelectedAccusationSuspect(null);
      }

      await refreshInvestigationStatus();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Cannot submit accusation yet');
    } finally {
      setIsSubmittingAccusation(false);
    }
  };

  const handleAddConnection = async (from: string, to: string, description: string) => {
    if (!currentGame) return;
    try {
      const response = await gameApi.addConnection(currentGame.gameId, {
        from,
        to,
        type: 'evidence',
        description,
      });
      const data = response.data.data;
      if (data.gameState) setCurrentGame(data.gameState);
      addHint(data.contextualHint);
      await refreshInvestigationStatus();
    } catch (error) {
      console.error('Failed to add connection:', error);
    }
  };

  const handleRemoveConnection = async (id: string) => {
    if (!currentGame) return;
    const updated = currentGame.boardConnections.filter(c => c.id !== id);
    try {
      const response = await gameApi.updateState(currentGame.gameId, { boardConnections: updated });
      setCurrentGame(response.data.data);
    } catch (error) {
      console.error('Failed to remove connection:', error);
    }
  };

  if (isLoadingGame || !currentGame || !currentCase) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span className="text-textMuted">Loading case...</span>
      </div>
    );
  }

  const allNPCs = [...currentCase.suspects, ...currentCase.witnesses];
  const collectedEvidence = currentCase.evidence.filter(e =>
    currentGame.collectedEvidence.includes(e.id)
  );

  const caseClosed =
    currentCase.status === 'solved' ||
    currentCase.status === 'failed' ||
    currentGame.phase === 'conclusion' ||
    (accusationResult?.caseClosed ?? false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass-card m-4 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="glass-button p-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold gradient-text">{currentCase.title}</h1>
            <p className="text-sm text-textMuted">
              {currentCase.location} · {currentCase.country}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGetHint}
            disabled={isRequestingHint || caseClosed}
            className="glass-button flex items-center gap-2 disabled:opacity-50"
          >
            <Lightbulb className="w-5 h-5" />
            {isRequestingHint ? 'Analyzing...' : 'Hint'}
          </button>
          <button onClick={handleSave} className="glass-button flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save
          </button>
        </div>
      </header>

      <div className="mx-4 mb-2 glass-card p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Victim Profile</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-semibold">{currentCase.victim?.name || currentCase.victimName}</span></p>
              <p className="text-textMuted">{currentCase.victim?.age || 'Unknown'} Years · {currentCase.victim?.gender || 'Unknown'}</p>
              <p className="text-textMuted">{currentCase.victim?.occupation || 'Unknown'}</p>
              <p className="text-textMuted">{currentCase.victim?.city || currentCase.location}</p>
              {currentCase.victim?.relationships && currentCase.victim.relationships.length > 0 && (
                <p className="text-textMuted">{currentCase.victim.relationships.join(' · ')}</p>
              )}
              <p className="text-textMuted italic mt-2">{currentCase.victim?.background || currentCase.victimDetails}</p>
              {currentCase.victim?.lifestyle && (
                <p className="text-textMuted italic mt-1">{currentCase.victim.lifestyle}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <InvestigationHints
        hints={activeHints}
        onDismiss={(id) => setActiveHints(prev => prev.filter(h => h.id !== id))}
      />

      {accusationResult && !investigationStatus && (
        <div className="mx-4 mb-2 glass-card p-4 border-l-4 border-primary">
          <p className="text-sm">{accusationResult.explanation}</p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        <nav className="glass-card p-4 flex flex-col gap-2 w-64">
          {[
            { id: 'investigation', icon: Search, label: 'Investigation' },
            { id: 'interrogation', icon: MessageSquare, label: 'Interrogation' },
            { id: 'board', icon: Network, label: 'Crime Board' },
            { id: 'evidence', icon: FileText, label: 'Evidence' },
            { id: 'timeline', icon: Map, label: 'Timeline' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'glass-button flex items-center gap-3 justify-start',
                activeTab === tab.id && 'bg-primary/20 border-primary'
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}

          <AccusationPanel
            status={investigationStatus}
            selectedSuspectId={selectedAccusationSuspect}
            onSelectSuspect={setSelectedAccusationSuspect}
            onSubmit={handleSubmitAccusation}
            isSubmitting={isSubmittingAccusation}
            caseClosed={caseClosed}
            result={accusationResult}
          />
        </nav>

        <main className="flex-1 glass-card p-6 overflow-auto custom-scrollbar">
          {activeTab === 'investigation' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">Crime Scene Investigation</h2>
              <p className="text-textMuted mb-6">{currentCase.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentCase.clues.map((clue) => (
                  <motion.div
                    key={clue.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'glass-card p-4 cursor-pointer transition-all',
                      currentGame.discoveredClues.includes(clue.id) ? 'opacity-50' : 'hover:scale-105'
                    )}
                    onClick={() => !currentGame.discoveredClues.includes(clue.id) && handleDiscoverClue(clue.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn('px-2 py-1 rounded text-xs', getImportanceColor(clue.importance))}>
                        {clue.importance}
                      </span>
                      {currentGame.discoveredClues.includes(clue.id) && (
                        <span className="text-success text-sm">Discovered</span>
                      )}
                    </div>
                    <h3 className="font-semibold mb-2">{clue.name}</h3>
                    <p className="text-sm text-textMuted">{clue.description}</p>
                    <p className="text-xs text-textMuted mt-2">📍 {clue.location}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'interrogation' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">Interrogation Room</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {allNPCs.map((npc) => (
                  <motion.div
                    key={npc.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => handleSelectNPC(npc.id)}
                    className={cn(
                      'glass-card p-4 cursor-pointer transition-all',
                      selectedNPC === npc.id && 'border-primary bg-primary/10'
                    )}
                  >
                    <h3 className="font-semibold mb-1">{npc.name}</h3>
                    <p className="text-sm text-textMuted">{npc.occupation}</p>
                    {'personality' in npc && npc.personality && (
                      <p className="text-xs text-textMuted mt-1 italic">{npc.personality}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className={cn('px-2 py-1 rounded text-xs', getEmotionalStateColor(npc.emotionalState?.current))}>
                        {npc.emotionalState?.current || 'calm'}
                      </span>
                      {currentGame.interviewedNPCs.includes(npc.id) && (
                        <span className="text-xs text-textMuted">Interviewed</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {selectedNPC && selectedNpcData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6"
                >
                  <h3 className="text-xl font-semibold mb-1">
                    Interviewing {selectedNpcData.name}
                  </h3>
                  <p className="text-sm text-textMuted mb-4">
                    {selectedNpcData.occupation}
                    {'relationshipToVictim' in selectedNpcData && selectedNpcData.relationshipToVictim
                      ? ` · ${selectedNpcData.relationshipToVictim}`
                      : ''}
                  </p>

                  <div className="space-y-4 mb-6 max-h-72 overflow-auto custom-scrollbar">
                    {selectedNpcDialogue.length === 0 && (
                      <p className="text-textMuted text-sm italic">
                        No prior conversation with {selectedNpcData.name}. Begin your interrogation.
                      </p>
                    )}
                    {selectedNpcDialogue.map((msg, index) => (
                      <div
                        key={index}
                        className={cn(
                          'p-3 rounded-lg',
                          msg.type === 'player' ? 'bg-primary/20 ml-8' : 'bg-surfaceLight mr-8'
                        )}
                      >
                        <p className="text-xs text-textMuted mb-1">
                          {msg.type === 'player' ? 'You' : selectedNpcData.name}
                        </p>
                        <p>{msg.content}</p>
                        {msg.emotionalReaction && msg.type === 'npc' && (
                          <p className="text-xs text-textMuted mt-1 capitalize">
                            Reaction: {msg.emotionalReaction}
                          </p>
                        )}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {collectedEvidence.length > 0 && (
                    <div className="mb-4">
                      <label className="text-xs text-textMuted block mb-1">Present Evidence (optional)</label>
                      <select
                        value={selectedEvidence || ''}
                        onChange={(e) => setSelectedEvidence(e.target.value || null)}
                        className="glass-input w-full text-sm"
                        style={{ backgroundColor: 'rgba(18,18,26)', color: '#e2e8f0' }}
                      >
                        <option value="" style={{ backgroundColor: '#0c0c12', color: '#e2e8f0' }}>No evidence</option>
                        {collectedEvidence.map(ev => (
                          <option key={ev.id} value={ev.id} style={{ backgroundColor: '#0c0c12', color: '#e2e8f0' }}>{ev.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 mb-3">
                    {(['neutral', 'aggressive', 'empathetic'] as const).map(a => (
                      <button
                        key={a}
                        onClick={() => setApproach(a)}
                        className={cn(
                        'px-3 py-1 rounded text-xs capitalize',
                        approach === a ? 'bg-primary/30 border border-primary' : 'bg-surfaceLight'
                      )}
                      >
                        {a}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleInterview()}
                      placeholder={`Ask ${selectedNpcData.name} a question...`}
                      className="glass-input flex-1"
                      style={{ backgroundColor: 'rgba(18,18,26)', color: '#e2e8f0' }}
                      disabled={isInterviewing}
                    />
                    <button
                      onClick={handleInterview}
                      disabled={!question.trim() || isInterviewing}
                      className="glass-button"
                    >
                      {isInterviewing ? '...' : 'Ask'}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {activeTab === 'board' && (
            <CrimeBoard
              clues={currentCase.clues}
              suspects={currentCase.suspects}
              evidence={currentCase.evidence}
              connections={currentGame.boardConnections}
              onAddConnection={handleAddConnection}
              onRemoveConnection={handleRemoveConnection}
            />
          )}

          {activeTab === 'evidence' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">Evidence Locker</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentCase.evidence.map((evidence) => (
                  <motion.div
                    key={evidence.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'glass-card p-4',
                      !currentGame.collectedEvidence.includes(evidence.id) && 'cursor-pointer hover:scale-105'
                    )}
                    onClick={() =>
                      !currentGame.collectedEvidence.includes(evidence.id) &&
                      handleCollectEvidence(evidence.id)
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-1 rounded text-xs bg-primary/20 text-primary">
                        {evidence.type}
                      </span>
                      {currentGame.collectedEvidence.includes(evidence.id) ? (
                        <span className="text-success text-sm">Collected</span>
                      ) : (
                        <span className="text-xs text-textMuted">Click to collect</span>
                      )}
                    </div>
                    <h3 className="font-semibold mb-2">{evidence.name}</h3>
                    <p className="text-sm text-textMuted">{evidence.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">Timeline Reconstruction</h2>
              <div className="space-y-4">
                {currentCase.timeline.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-card p-4 flex gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 rounded-full bg-primary" />
                      {index < currentCase.timeline.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm text-primary">{event.time}</span>
                        {event.verified && (
                          <span className="text-xs text-success">✓ Verified</span>
                        )}
                      </div>
                      <p className="mb-2">{event.description}</p>
                      <p className="text-sm text-textMuted">📍 {event.location}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {event.participants.map((participant) => (
                          <span key={participant} className="text-xs px-2 py-1 bg-surfaceLight rounded">
                            {participant}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function getImportanceColor(importance: string): string {
  switch (importance) {
    case 'critical': return 'bg-red-500/20 text-red-400';
    case 'high': return 'bg-orange-500/20 text-orange-400';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400';
    case 'low': return 'bg-gray-500/20 text-gray-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

function getEmotionalStateColor(state?: string): string {
  switch (state) {
    case 'calm': return 'bg-green-500/20 text-green-400';
    case 'nervous': return 'bg-yellow-500/20 text-yellow-400';
    case 'angry': return 'bg-red-500/20 text-red-400';
    case 'sad': return 'bg-blue-500/20 text-blue-400';
    case 'defensive': return 'bg-orange-500/20 text-orange-400';
    case 'cooperative': return 'bg-emerald-500/20 text-emerald-400';
    case 'hostile': return 'bg-red-600/20 text-red-500';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}
