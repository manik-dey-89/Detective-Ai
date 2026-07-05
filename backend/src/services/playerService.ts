import { v4 as uuidv4 } from 'uuid';
import { Player, PlayerStatistics, Reputation, Achievement, GameState } from '../types';
import { cogneeClient } from '../config/cognee';
import { dbService } from './databaseService';
import { normalizeStatistics, recalculateAccuracy, updateAverageInvestigationTime } from '../utils/statistics';
import logger from '../config/logger';

export class PlayerService {
  private players: Map<string, Player> = new Map();
  private saves: Map<string, GameState> = new Map();

  // Achievement definitions
  private achievements: Record<string, Achievement> = {
    first_case: {
      id: 'first_case',
      name: 'First Steps',
      description: 'Solve your first case',
      unlockedAt: '',
      rarity: 'common',
      icon: '🔍',
    },
    perfect_case: {
      id: 'perfect_case',
      name: 'Perfect Detective',
      description: 'Solve a case without using hints',
      unlockedAt: '',
      rarity: 'epic',
      icon: '⭐',
    },
    speed_demon: {
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Solve a case in under 10 minutes',
      unlockedAt: '',
      rarity: 'rare',
      icon: '⚡',
    },
    master_detective: {
      id: 'master_detective',
      name: 'Master Detective',
      description: 'Solve 10 cases',
      unlockedAt: '',
      rarity: 'legendary',
      icon: '🏆',
    },
    memory_keeper: {
      id: 'memory_keeper',
      name: 'Memory Keeper',
      description: 'Store 100 memories',
      unlockedAt: '',
      rarity: 'rare',
      icon: '🧠',
    },
  };

  async createPlayer(name: string): Promise<Player> {
    // Check if player with this name already exists
    const existing = dbService.getPlayerByName(name);
    if (existing) {
      throw new Error('A detective with this name already exists');
    }

    const now = new Date().toISOString();
    const player: Player = {
      id: uuidv4(),
      name,
      brainId: `brain-${uuidv4()}`,
      createdAt: now,
      updatedAt: now,
      statistics: normalizeStatistics({
        casesSolved: 0,
        casesAttempted: 0,
        activeCases: 0,
        failedCases: 0,
        totalPlayTime: 0,
        averageInvestigationTime: 0,
        cluesFound: 0,
        cluesTotal: 0,
        evidenceCollected: 0,
        suspectsInterrogated: 0,
        interrogationsConducted: 0,
        correctDeductions: 0,
        wrongDeductions: 0,
        accuracyRate: 0,
        xp: 0,
        favoriteDifficulty: 'medium',
      }),
      reputation: {
        level: 1,
        points: 0,
        rank: 'Rookie',
        traits: [],
        organizationStanding: {
          police: 50,
          media: 50,
          public: 50,
        },
      },
      achievements: [],
      settings: {
        difficulty: 'medium',
        soundEnabled: true,
        musicEnabled: true,
        autoSave: true,
        notifications: true,
        theme: 'dark',
      },
    };

    this.players.set(player.id, player);
    
    // Save to database
    dbService.savePlayer(player);

    // Store player creation in memory
    await cogneeClient.remember({
      playerId: player.id,
      brainId: player.brainId,
      type: 'behavior',
      content: { action: 'player_created', name },
      importance: 10,
      tags: ['player', 'created'],
    });

    return player;
  }

  async getOrLoginPlayer(name: string): Promise<Player> {
    // Try to get existing player by name
    let player = dbService.getPlayerByName(name);
    if (player) {
      this.players.set(player.id, player);
      
      // If player doesn't have a brainId yet, assign one
      if (!player.brainId) {
        player.brainId = `brain-${uuidv4()}`;
        player.updatedAt = new Date().toISOString();
        dbService.savePlayer(player);
      }
      
      logger.info(`Detective logged in: ${player.name}`, { playerId: player.id, brainId: player.brainId });
      
      return player;
    }
    
    // If not found, create new one
    const newPlayer = await this.createPlayer(name);
    logger.info(`New detective created: ${newPlayer.name}`, { playerId: newPlayer.id, brainId: newPlayer.brainId });
    
    return newPlayer;
  }

  async getAllPlayers(): Promise<Player[]> {
    return dbService.getAllPlayers();
  }

  async ensurePlayer(id: string): Promise<Player> {
    const player = await this.getPlayer(id);
    if (!player) {
      throw new Error('Player not found');
    }
    return player;
  }

  private persistPlayer(player: Player): Player {
    const updated = { ...player, updatedAt: new Date().toISOString() };
    this.players.set(player.id, updated);
    dbService.savePlayer(updated);
    return updated;
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    if (this.players.has(id)) {
      return this.players.get(id);
    }

    // Try to get from database
    const player = dbService.getPlayer(id);
    if (player) {
      this.players.set(id, player);
      return player;
    }

    return undefined;
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
    const player = await this.ensurePlayer(id);
    const updatedPlayer = { ...player, ...updates, updatedAt: new Date().toISOString() };
    return this.persistPlayer(updatedPlayer);
  }

  async updateStatistics(id: string, stats: Partial<PlayerStatistics>): Promise<Player> {
    const player = await this.ensurePlayer(id);
    let updatedStats = recalculateAccuracy({ ...player.statistics, ...stats });
    updatedStats = this.syncCaseCounts(updatedStats, id);

    const updatedPlayer = { ...player, statistics: updatedStats };
    const persisted = this.persistPlayer(updatedPlayer);
    await this.checkAchievements(id, persisted);
    return persisted;
  }

  async onCaseStarted(playerId: string, difficulty: string): Promise<Player> {
    const player = await this.ensurePlayer(playerId);
    const stats = recalculateAccuracy({
      ...player.statistics,
      casesAttempted: player.statistics.casesAttempted + 1,
      favoriteDifficulty: difficulty,
    });
    const synced = this.syncCaseCounts(stats, playerId);
    return this.persistPlayer({ ...player, statistics: synced });
  }

  async onClueDiscovered(playerId: string): Promise<Player> {
    const player = await this.ensurePlayer(playerId);
    return this.persistPlayer({
      ...player,
      statistics: { ...player.statistics, cluesFound: player.statistics.cluesFound + 1 },
    });
  }

  async onEvidenceCollected(playerId: string): Promise<Player> {
    const player = await this.ensurePlayer(playerId);
    return this.persistPlayer({
      ...player,
      statistics: {
        ...player.statistics,
        evidenceCollected: player.statistics.evidenceCollected + 1,
      },
    });
  }

  async onSuspectInterrogated(playerId: string, isNewSuspect: boolean): Promise<Player> {
    const player = await this.ensurePlayer(playerId);
    return this.persistPlayer({
      ...player,
      statistics: {
        ...player.statistics,
        interrogationsConducted: player.statistics.interrogationsConducted + 1,
        suspectsInterrogated: isNewSuspect
          ? player.statistics.suspectsInterrogated + 1
          : player.statistics.suspectsInterrogated,
      },
    });
  }

  async onPlayTimeUpdate(playerId: string, deltaSeconds: number): Promise<Player> {
    const player = await this.ensurePlayer(playerId);
    return this.persistPlayer({
      ...player,
      statistics: {
        ...player.statistics,
        totalPlayTime: player.statistics.totalPlayTime + deltaSeconds,
      },
    });
  }

  async onAccusation(
    playerId: string,
    isCorrect: boolean,
    score: number,
    investigationSeconds: number,
    caseClosed: boolean
  ): Promise<Player> {
    const player = await this.ensurePlayer(playerId);
    let stats = { ...player.statistics };

    if (isCorrect) {
      stats.correctDeductions += 1;
      stats.xp += Math.max(score, 100);
    } else {
      stats.wrongDeductions += 1;
      stats.xp += Math.max(Math.floor(score / 4), 5);
    }

    stats = recalculateAccuracy(stats);

    if (caseClosed) {
      stats = updateAverageInvestigationTime(stats, investigationSeconds);
      stats = this.syncCaseCounts(stats, playerId);
    }

    let reputation = { ...player.reputation };
    const repPoints = isCorrect
      ? Math.max(Math.floor(score / 2), 50)
      : (caseClosed ? -40 : -15);
    reputation.points = Math.max(0, reputation.points + repPoints);
    reputation.level = Math.floor(reputation.points / 100) + 1;
    reputation.rank = this.getRankForLevel(reputation.level);

    const updated = this.persistPlayer({ ...player, statistics: stats, reputation });
    if (caseClosed) {
      await this.checkAchievements(playerId, updated);
    }
    return updated;
  }

  private syncCaseCounts(stats: PlayerStatistics, playerId: string): PlayerStatistics {
    const counts = dbService.getCaseStatusCounts(playerId);
    return {
      ...stats,
      activeCases: counts.active,
      casesSolved: counts.solved,
      failedCases: counts.failed,
    };
  }

  async getAchievements(id: string): Promise<Achievement[]> {
    const player = await this.ensurePlayer(id);
    return player.achievements;
  }

  async unlockAchievement(playerId: string, achievementId: string): Promise<Achievement> {
    const player = await this.ensurePlayer(playerId);

    const achievement = this.achievements[achievementId];
    if (!achievement) {
      throw new Error('Achievement not found');
    }

    // Check if already unlocked
    if (player.achievements.some(a => a.id === achievementId)) {
      return achievement;
    }

    const unlockedAchievement: Achievement = {
      ...achievement,
      unlockedAt: new Date().toISOString(),
    };

    player.achievements.push(unlockedAchievement);
    this.persistPlayer(player);

    // Store in memory
    await cogneeClient.remember({
      playerId,
      brainId: player.brainId,
      type: 'behavior',
      content: { action: 'achievement_unlocked', achievementId },
      importance: 7,
      tags: ['achievement', achievementId],
    });

    return unlockedAchievement;
  }

  async updateReputation(id: string, points: number, organization?: string): Promise<Player> {
    const player = await this.ensurePlayer(id);

    const updatedReputation = { ...player.reputation };
    updatedReputation.points = Math.max(0, updatedReputation.points + points);

    if (organization && updatedReputation.organizationStanding[organization] !== undefined) {
      updatedReputation.organizationStanding[organization] = Math.max(
        0,
        Math.min(100, updatedReputation.organizationStanding[organization] + points / 10)
      );
    }

    updatedReputation.level = Math.floor(updatedReputation.points / 100) + 1;
    updatedReputation.rank = this.getRankForLevel(updatedReputation.level);

    return this.persistPlayer({ ...player, reputation: updatedReputation });
  }

  async getMemoryGraph(id: string): Promise<any> {
    // Get player first to get brainId
    const player = dbService.getPlayer(id);
    if (!player) {
      throw new Error('Player not found');
    }

    // Get player memories from Cognee with brainId
    const memories = await cogneeClient.recall({ 
      playerId: id, 
      brainId: player.brainId, 
      limit: 50 
    });

    // Build graph structure
    const nodes: any[] = [];
    const links: any[] = [];

    memories.forEach((memory: any) => {
      nodes.push({
        id: memory.id,
        type: memory.type,
        content: memory.content,
        timestamp: memory.timestamp,
      });

      // Add links based on relationships
      if (memory.caseId) {
        links.push({
          source: memory.id,
          target: memory.caseId,
          type: 'case',
        });
      }
      if (memory.npcId) {
        links.push({
          source: memory.id,
          target: memory.npcId,
          type: 'npc',
        });
      }
    });

    return { nodes, links };
  }

  async saveProgress(id: string, gameState: GameState): Promise<any> {
    const player = await this.ensurePlayer(id);
    const saveId = uuidv4();
    this.saves.set(saveId, gameState);

    // Store save reference in memory
    await cogneeClient.remember({
      playerId: id,
      brainId: player.brainId,
      type: 'behavior',
      content: { action: 'game_saved', gameId: gameState.gameId },
      importance: 6,
      tags: ['save', 'progress'],
    });

    return { saveId, timestamp: new Date().toISOString() };
  }

  async loadProgress(id: string): Promise<GameState | undefined> {
    // Find most recent save for player
    const saves = Array.from(this.saves.entries())
      .filter(([_, state]) => state.playerId === id)
      .sort((a, b) => new Date(b[1].lastSaved).getTime() - new Date(a[1].lastSaved).getTime());

    return saves[0]?.[1];
  }

  private async checkAchievements(playerId: string, player: Player): Promise<void> {
    // Check first case
    if (player.statistics.casesSolved >= 1 && !player.achievements.some(a => a.id === 'first_case')) {
      await this.unlockAchievement(playerId, 'first_case');
    }

    // Check master detective
    if (player.statistics.casesSolved >= 10 && !player.achievements.some(a => a.id === 'master_detective')) {
      await this.unlockAchievement(playerId, 'master_detective');
    }
  }

  private getRankForLevel(level: number): string {
    const ranks = [
      'Rookie', 'Investigator', 'Detective', 'Senior Detective',
      'Lead Detective', 'Master Detective', 'Legendary Detective',
    ];
    return ranks[Math.min(level - 1, ranks.length - 1)];
  }

  async deletePlayer(playerId: string): Promise<void> {
    logger.info('Starting player deletion', { playerId });
    
    // Get the player first to retrieve brainId
    const player = dbService.getPlayer(playerId);
    if (player) {
      logger.info('Deleting Cognee memories', { brainId: player.brainId });
      // Delete all Cognee memories (will throw error if fails
      await cogneeClient.deleteAllMemoriesForBrain(player.brainId);
    }

    // Delete all DB resources (already cascades to cases, games, memories)
    logger.info('Deleting database resources for player', { playerId });
    dbService.deletePlayer(playerId);

    // Delete from local cache
    if (this.players.has(playerId)) {
      this.players.delete(playerId);
    }

    // Also delete any saved games in saves cache
    for (const [saveId, saveGame] of this.saves.entries()) {
      if (saveGame.playerId === playerId) {
        this.saves.delete(saveId);
      }
    }

    logger.info('Player deletion complete', { playerId });
  }
}

export const playerService = new PlayerService();
