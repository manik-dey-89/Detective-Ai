import { v4 as uuidv4 } from 'uuid';
import { GameState, CaseNote, BoardConnection, EvidenceAnalysis, InterrogationMessage, Case, Player } from '../types';
import { CaseService } from './caseService';
import { playerService } from './playerService';
import { dbService } from './databaseService';
import { interrogationService } from './interrogationService';
import {
  getInvestigationStatus,
  pickHint,
  evaluateAccusation,
  HintTrigger,
} from './investigationService';
import logger from '../config/logger';

const gameCache = new Map<string, GameState>();

export class GameService {
  private games: Map<string, GameState> = gameCache;
  private caseService: CaseService;

  constructor() {
    this.caseService = new CaseService();
  }

  async generateAndStart(params: {
    difficulty: string;
    crimeType: string;
    location?: string;
    playerId: string;
  }): Promise<{ case: Case; game: GameState; player: Player }> {
    const newCase = await this.caseService.generateCase(params);
    const game = await this.startGame(newCase.id, params.playerId);
    const player = await playerService.onCaseStarted(params.playerId, params.difficulty);
    return { case: newCase, game, player };
  }

  async startGame(caseId: string, playerId: string): Promise<GameState> {
    const existing = dbService.getGameByPlayerAndCase(playerId, caseId);
    if (existing) {
      this.games.set(existing.gameId, existing);
      return existing;
    }

    const gameCase = await this.caseService.getCase(caseId);
    if (!gameCase) throw new Error('Case not found');

    const gameState: GameState = {
      gameId: uuidv4(),
      caseId,
      playerId,
      currentLocation: gameCase.location,
      phase: 'investigation',
      discoveredClues: [],
      collectedEvidence: [],
      interviewedNPCs: [],
      interrogationHistory: {},
      shownEvidence: [],
      timelineProgress: 0,
      notes: [],
      boardConnections: [],
      evidenceAnalyses: [],
      startTime: new Date().toISOString(),
      lastPlayed: new Date().toISOString(),
      playTime: 0,
      lastSaved: new Date().toISOString(),
      wrongAccusations: 0,
      deliveredHintIds: [],
    };

    this.games.set(gameState.gameId, gameState);
    dbService.saveGame(gameState);
    return gameState;
  }

  async getGameState(gameId: string): Promise<GameState | undefined> {
    if (this.games.has(gameId)) {
      return this.games.get(gameId);
    }

    const dbGame = dbService.getGame(gameId);
    if (dbGame) {
      this.games.set(gameId, dbGame);
      return dbGame;
    }

    return undefined;
  }

  async updateGameState(gameId: string, updates: Partial<GameState>): Promise<GameState> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');

    const updatedState: GameState = {
      ...gameState,
      ...updates,
      lastSaved: new Date().toISOString(),
      lastPlayed: new Date().toISOString(),
    };
    this.games.set(gameId, updatedState);
    dbService.saveGame(updatedState);
    return updatedState;
  }

  async incrementPlayTime(gameId: string, deltaSeconds: number): Promise<GameState> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');
    if (gameState.phase === 'conclusion' || deltaSeconds <= 0) return gameState;

    const updated = await this.updateGameState(gameId, {
      playTime: gameState.playTime + deltaSeconds,
    });
    await playerService.onPlayTimeUpdate(gameState.playerId, deltaSeconds);
    return updated;
  }

  async discoverClue(gameId: string, clueId: string): Promise<{ gameState: GameState; player: Player }> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');

    let updatedState = gameState;
    if (!gameState.discoveredClues.includes(clueId)) {
      updatedState = await this.updateGameState(gameId, {
        discoveredClues: [...gameState.discoveredClues, clueId],
      });
      const player = await playerService.onClueDiscovered(gameState.playerId);
      return { gameState: updatedState, player };
    }

    const player = await playerService.ensurePlayer(gameState.playerId);
    return { gameState: updatedState, player };
  }

  async collectEvidence(gameId: string, evidenceId: string): Promise<{ gameState: GameState; player: Player; contextualHint?: { id: string; text: string; trigger: string } | null }> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');

    let updatedState = gameState;
    if (!gameState.collectedEvidence.includes(evidenceId)) {
      updatedState = await this.updateGameState(gameId, {
        collectedEvidence: [...gameState.collectedEvidence, evidenceId],
      });
      const player = await playerService.onEvidenceCollected(gameState.playerId);

      const gameCase = await this.caseService.getCase(gameState.caseId);
      let contextualHint = null;
      if (gameCase) {
        contextualHint = pickHint(gameCase, updatedState, 'alibi_contradiction');
        if (contextualHint) {
          updatedState = await this.updateGameState(gameId, {
            deliveredHintIds: [...(updatedState.deliveredHintIds ?? []), contextualHint.id],
          });
        }
      }

      return { gameState: updatedState, player, contextualHint };
    }

    const player = await playerService.ensurePlayer(gameState.playerId);
    return { gameState: updatedState, player };
  }

  async interviewNPC(
    gameId: string,
    npcId: string,
    question: string,
    approach?: string,
    evidenceId?: string
  ): Promise<any> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');

    const gameCase = await this.caseService.getCase(gameState.caseId);
    if (!gameCase) throw new Error('Case not found');

    const npcExists = [...gameCase.suspects, ...gameCase.witnesses].some(n => n.id === npcId);
    if (!npcExists) throw new Error(`NPC not found in current case: ${npcId}`);

    const history: InterrogationMessage[] = gameState.interrogationHistory[npcId] || [];
    const shownEvidence = evidenceId
      ? [...new Set([...gameState.shownEvidence, evidenceId])]
      : gameState.shownEvidence;

    const result = await interrogationService.interrogate({
      gameCase,
      npcId,
      question,
      approach,
      history,
      shownEvidenceIds: shownEvidence,
      collectedEvidenceIds: gameState.collectedEvidence,
    });

    const timestamp = new Date().toISOString();
    const playerMsg: InterrogationMessage = {
      type: 'player',
      content: question,
      timestamp,
      evidenceId,
    };
    const npcMsg: InterrogationMessage = {
      type: 'npc',
      content: result.dialogue,
      timestamp,
      emotionalReaction: result.emotionalReaction,
      npcName: result.npcName,
    };

    const updatedHistory = {
      ...gameState.interrogationHistory,
      [npcId]: [...history, playerMsg, npcMsg],
    };

    const isNewSuspect = !gameState.interviewedNPCs.includes(npcId);
    const interviewedNPCs = isNewSuspect
      ? [...gameState.interviewedNPCs, npcId]
      : gameState.interviewedNPCs;

    await this.caseService.updateCase(gameState.caseId, {
      suspects: gameCase.suspects,
      witnesses: gameCase.witnesses,
    });

    const updatedGameState = await this.updateGameState(gameId, {
      interrogationHistory: updatedHistory,
      shownEvidence,
      interviewedNPCs,
    });

    let finalState = updatedGameState;
    let hint = null;
    if (result.lieExposed) {
      hint = pickHint(gameCase, updatedGameState, 'lie_exposed', {
        suspectId: npcId,
        lieText: result.lieExposed,
      });
      if (hint) {
        finalState = await this.updateGameState(gameId, {
          deliveredHintIds: [...(updatedGameState.deliveredHintIds ?? []), hint.id],
        });
      }
    }

    const player = await playerService.onSuspectInterrogated(gameState.playerId, isNewSuspect);

    return {
      dialogue: result.dialogue,
      emotionalReaction: result.emotionalReaction,
      npcId: result.npcId,
      npcName: result.npcName,
      lieDetected: result.lieDetected,
      lieExposed: result.lieExposed,
      updatedEmotionalState: result.updatedEmotionalState,
      gameState: finalState,
      player,
      contextualHint: hint,
    };
  }

  async addNote(gameId: string, note: Omit<CaseNote, 'id' | 'timestamp'>): Promise<GameState> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');

    const newNote: CaseNote = {
      id: uuidv4(),
      ...note,
      timestamp: new Date().toISOString(),
    };

    return this.updateGameState(gameId, {
      notes: [...gameState.notes, newNote],
    });
  }

  async addConnection(
    gameId: string,
    connection: Omit<BoardConnection, 'id'>
  ): Promise<{ gameState: GameState; contextualHint?: { id: string; text: string; trigger: string } | null }> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');

    const newConnection: BoardConnection = {
      id: uuidv4(),
      ...connection,
      strength: connection.strength ?? 5,
    };

    let updatedState = await this.updateGameState(gameId, {
      boardConnections: [...gameState.boardConnections, newConnection],
    });

    const gameCase = await this.caseService.getCase(gameState.caseId);
    let contextualHint = null;
    if (gameCase) {
      contextualHint = pickHint(gameCase, updatedState, 'connection_insight', {
        connection: newConnection,
      });
      if (contextualHint) {
        updatedState = await this.updateGameState(gameId, {
          deliveredHintIds: [...(updatedState.deliveredHintIds ?? []), contextualHint.id],
        });
      }
    }

    return { gameState: updatedState, contextualHint };
  }

  async markTimelineReviewed(
    gameId: string
  ): Promise<{ gameState: GameState; contextualHint?: { id: string; text: string; trigger: string } | null }> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');
    if ((gameState.timelineProgress ?? 0) >= 1) {
      return { gameState };
    }

    let updated = await this.updateGameState(gameId, { timelineProgress: 1 });

    const gameCase = await this.caseService.getCase(gameState.caseId);
    if (!gameCase) return { gameState: updated };

    const hint = pickHint(gameCase, updated, 'timeline_inconsistency');
    if (hint) {
      updated = await this.updateGameState(gameId, {
        deliveredHintIds: [...(updated.deliveredHintIds ?? []), hint.id],
      });
      return { gameState: updated, contextualHint: hint };
    }

    return { gameState: updated };
  }

  async getInvestigationStatus(gameId: string) {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');

    const gameCase = await this.caseService.getCase(gameState.caseId);
    if (!gameCase) throw new Error('Case not found');

    return getInvestigationStatus(gameCase, gameState);
  }

  async requestHint(
    gameId: string,
    trigger: HintTrigger = 'manual'
  ): Promise<{ hint: { id: string; text: string; trigger: string } | null; gameState: GameState }> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');

    const gameCase = await this.caseService.getCase(gameState.caseId);
    if (!gameCase) throw new Error('Case not found');

    const hint = pickHint(gameCase, gameState, trigger);
    if (!hint) {
      return { hint: null, gameState };
    }

    const updated = await this.updateGameState(gameId, {
      deliveredHintIds: [...(gameState.deliveredHintIds ?? []), hint.id],
    });

    return { hint, gameState: updated };
  }

  async checkAlibiContradictionHints(gameId: string): Promise<{ hint: { id: string; text: string; trigger: string } | null; gameState: GameState }> {
    return this.requestHint(gameId, 'alibi_contradiction');
  }

  async analyzeEvidence(gameId: string, evidenceId: string, _analysisType: string): Promise<EvidenceAnalysis> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');

    const gameCase = await this.caseService.getCase(gameState.caseId);
    if (!gameCase) throw new Error('Case not found');

    const evidence = gameCase.evidence.find(e => e.id === evidenceId);
    if (!evidence) throw new Error('Evidence not found');

    return evidence.analysis || {};
  }

  async autoSave(gameId: string): Promise<{ gameState: GameState; player: Player }> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');
    const updatedState = await this.updateGameState(gameId, { lastSaved: new Date().toISOString() });
    const player = await playerService.ensurePlayer(gameState.playerId);
    return { gameState: updatedState, player };
  }

  async loadGame(saveId: string): Promise<{ gameState: GameState; player: Player }> {
    const gameState = await this.getGameState(saveId);
    if (!gameState) throw new Error('Game not found');
    const player = await playerService.ensurePlayer(gameState.playerId);
    return { gameState, player };
  }

  async deleteGame(gameId: string): Promise<void> {
    this.games.delete(gameId);
    dbService.deleteGame(gameId);
  }

  async getPlayerGames(playerId: string): Promise<GameState[]> {
    const dbGames = dbService.getPlayerGames(playerId);
    dbGames.forEach(g => this.games.set(g.gameId, g));
    return dbGames;
  }

  async makeAccusation(
    gameId: string,
    suspectId: string
  ): Promise<{
    correct: boolean;
    caseClosed: boolean;
    canRetry: boolean;
    explanation: string;
    clueBreakdown: string[];
    missedClues?: string[];
    score: number;
    ending: string;
    wrongAccusations: number;
    gameState: GameState;
    player: Player;
  }> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) throw new Error('Game not found');

    const gameCase = await this.caseService.getCase(gameState.caseId);
    if (!gameCase) throw new Error('Case not found');

    const status = getInvestigationStatus(gameCase, gameState);
    if (!status.readyToAccuse) {
      throw new Error(`Investigation incomplete: ${status.missing.join('; ')}`);
    }

    const evaluation = evaluateAccusation(gameCase, gameState, suspectId);

    let updatedGameState: GameState;
    if (evaluation.correct) {
      await this.caseService.updateCaseStatus(gameCase.id, 'solved');
      updatedGameState = await this.updateGameState(gameId, { phase: 'conclusion' });
    } else if (evaluation.caseClosed) {
      await this.caseService.updateCaseStatus(gameCase.id, 'failed');
      updatedGameState = await this.updateGameState(gameId, {
        phase: 'conclusion',
        wrongAccusations: evaluation.wrongAccusations,
      });
    } else {
      updatedGameState = await this.updateGameState(gameId, {
        wrongAccusations: evaluation.wrongAccusations,
      });
    }

    const player = await playerService.onAccusation(
      gameState.playerId,
      evaluation.correct,
      evaluation.score,
      updatedGameState.playTime,
      evaluation.caseClosed || evaluation.correct
    );

    return {
      correct: evaluation.correct,
      caseClosed: evaluation.caseClosed || evaluation.correct,
      canRetry: evaluation.canRetry,
      explanation: evaluation.explanation,
      clueBreakdown: evaluation.clueBreakdown,
      missedClues: evaluation.missedClues,
      score: evaluation.score,
      ending: evaluation.ending,
      wrongAccusations: evaluation.wrongAccusations,
      gameState: updatedGameState,
      player,
    };
  }
}
