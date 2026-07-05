import { Case, Player, GameState, Memory, VictimProfile } from '../types';
import { databaseService } from '../config/database';
import { normalizeStatistics } from '../utils/statistics';
import Database from 'better-sqlite3';

class DBService {
  private db: Database.Database;

  constructor() {
    this.db = databaseService.getDB();
  }

  // Player operations
  savePlayer(player: Player): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO players 
      (id, name, brainId, statistics, reputation, achievements, settings, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      player.id,
      player.name,
      player.brainId,
      JSON.stringify(player.statistics),
      JSON.stringify(player.reputation),
      JSON.stringify(player.achievements),
      JSON.stringify(player.settings),
      player.createdAt,
      player.updatedAt
    );
  }

  getPlayer(id: string): Player | null {
    const row = this.db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    if (!row) return null;
    const r = row as any;
    return {
      id: r.id,
      name: r.name,
      brainId: r.brainId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      statistics: normalizeStatistics(JSON.parse(r.statistics)),
      reputation: JSON.parse(r.reputation),
      achievements: JSON.parse(r.achievements),
      settings: JSON.parse(r.settings),
    };
  }

  getPlayerByName(name: string): Player | null {
    const row = this.db.prepare('SELECT * FROM players WHERE name = ?').get(name);
    if (!row) return null;
    const r = row as any;
    return {
      id: r.id,
      name: r.name,
      brainId: r.brainId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      statistics: normalizeStatistics(JSON.parse(r.statistics)),
      reputation: JSON.parse(r.reputation),
      achievements: JSON.parse(r.achievements),
      settings: JSON.parse(r.settings),
    };
  }

  getAllPlayers(): Player[] {
    const rows = this.db.prepare('SELECT * FROM players ORDER BY updatedAt DESC').all();
    return (rows as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      brainId: r.brainId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      statistics: normalizeStatistics(JSON.parse(r.statistics)),
      reputation: JSON.parse(r.reputation),
      achievements: JSON.parse(r.achievements),
      settings: JSON.parse(r.settings),
    }));
  }

  private parseCaseRow(r: any): Case {
    const suspects = JSON.parse(r.suspects);
    const witnesses = JSON.parse(r.witnesses);
    // Parse victim from JSON if available, otherwise build properly (no placeholders!)
    let victim: VictimProfile;
    if (r.victim) {
      victim = JSON.parse(r.victim);
    } else {
      // Fallback only if we don't have victim JSON, but generate valid data (NO UNKNOWN/NA!)
      const victimName = r.victimName || 'Victim';
      victim = {
        name: victimName,
        age: 25 + Math.floor(Math.random() * 45),
        gender: ['male', 'female', 'non-binary'][Math.floor(Math.random() * 3)] as 'male' | 'female' | 'non-binary',
        occupation: ['Art Curator', 'Private Banker', 'Ship Captain', 'Forensic Accountant'][Math.floor(Math.random() * 4)],
        city: r.location.split(',')[0].trim(),
        background: `A prominent figure in ${r.country || 'the city'} with a complex past.`,
        relationships: ['Close to family', 'Had business connections'],
        personality: 'Reserved but observant',
        shortBiography: `Born and raised in ${r.country || 'the region'}, they had a successful career before their untimely death.`,
        lifestyle: 'Lived a comfortable life'
      };
    }
    return {
      id: r.id,
      playerId: r.playerId,
      title: r.title,
      description: r.description,
      difficulty: r.difficulty,
      crimeType: r.crimeType,
      location: r.location,
      country: r.country,
      victim,
      victimName: r.victimName || victim.name,
      victimDetails: r.victimDetails || victim.background,
      twist: r.twist || '',
      ending: r.ending || '',
      date: r.date,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      suspects: suspects.map((s: any) => ({
        ...s,
        secrets: s.secrets || [],
        relationships: s.relationships || [],
        truthfulFacts: s.truthfulFacts || [],
        lies: s.lies || [],
        exposedLies: s.exposedLies || [],
        dialogueTopics: s.dialogueTopics || [],
      })),
      witnesses: witnesses.map((w: any) => ({
        ...w,
        personality: w.personality || '',
        secrets: w.secrets || [],
        relationships: w.relationships || [],
        truthfulFacts: w.truthfulFacts || [],
        lies: w.lies || [],
        exposedLies: w.exposedLies || [],
        dialogueTopics: w.dialogueTopics || [],
        emotionalState: w.emotionalState || { current: 'cooperative', intensity: 0.3, factors: [] },
      })),
      clues: JSON.parse(r.clues),
      evidence: JSON.parse(r.evidence),
      timeline: JSON.parse(r.timeline),
      solution: JSON.parse(r.solution),
    };
  }

  // Case operations
  saveCase(caseData: Case, playerId: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cases 
      (id, playerId, title, description, difficulty, crimeType, location, country, date, status, 
       createdAt, completedAt, victim, victimName, victimDetails, twist, ending, 
       suspects, witnesses, clues, evidence, timeline, solution)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      caseData.id,
      playerId,
      caseData.title,
      caseData.description,
      caseData.difficulty,
      caseData.crimeType,
      caseData.location,
      caseData.country,
      caseData.date,
      caseData.status,
      caseData.createdAt,
      caseData.completedAt || null,
      JSON.stringify(caseData.victim),
      caseData.victimName,
      caseData.victimDetails,
      caseData.twist,
      caseData.ending,
      JSON.stringify(caseData.suspects),
      JSON.stringify(caseData.witnesses),
      JSON.stringify(caseData.clues),
      JSON.stringify(caseData.evidence),
      JSON.stringify(caseData.timeline),
      JSON.stringify(caseData.solution)
    );
  }

  getCase(id: string): Case | null {
    const row = this.db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
    if (!row) return null;
    return this.parseCaseRow(row);
  }

  getPlayerCases(playerId: string): Case[] {
    const rows = this.db.prepare('SELECT * FROM cases WHERE playerId = ? ORDER BY createdAt DESC').all(playerId);
    return (rows as any[]).map(row => this.parseCaseRow(row));
  }

  getCaseStatusCounts(playerId: string): { active: number; solved: number; failed: number } {
    const row = this.db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'solved' THEN 1 ELSE 0 END) as solved,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM cases WHERE playerId = ?
    `).get(playerId) as any;
    return {
      active: Number(row?.active ?? 0),
      solved: Number(row?.solved ?? 0),
      failed: Number(row?.failed ?? 0),
    };
  }

  // Game state operations
  saveGame(gameState: GameState): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO games 
      (gameId, caseId, playerId, currentLocation, phase, 
       discoveredClues, collectedEvidence, interviewedNPCs, 
       interrogationHistory, shownEvidence,
       notes, boardConnections, evidenceAnalyses, 
       startTime, lastPlayed, playTime, lastSaved, timelineProgress, wrongAccusations, deliveredHintIds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      gameState.gameId,
      gameState.caseId,
      gameState.playerId,
      gameState.currentLocation,
      gameState.phase,
      JSON.stringify(gameState.discoveredClues),
      JSON.stringify(gameState.collectedEvidence),
      JSON.stringify(gameState.interviewedNPCs),
      JSON.stringify(gameState.interrogationHistory || {}),
      JSON.stringify(gameState.shownEvidence || []),
      JSON.stringify(gameState.notes),
      JSON.stringify(gameState.boardConnections),
      JSON.stringify(gameState.evidenceAnalyses),
      gameState.startTime,
      gameState.lastPlayed,
      gameState.playTime,
      gameState.lastSaved || gameState.lastPlayed,
      gameState.timelineProgress || 0,
      gameState.wrongAccusations ?? 0,
      JSON.stringify(gameState.deliveredHintIds ?? [])
    );
  }

  private parseGameRow(r: any): GameState {
    return {
      gameId: r.gameId,
      caseId: r.caseId,
      playerId: r.playerId,
      currentLocation: r.currentLocation,
      phase: r.phase,
      discoveredClues: JSON.parse(r.discoveredClues),
      collectedEvidence: JSON.parse(r.collectedEvidence),
      interviewedNPCs: JSON.parse(r.interviewedNPCs),
      interrogationHistory: r.interrogationHistory ? JSON.parse(r.interrogationHistory) : {},
      shownEvidence: r.shownEvidence ? JSON.parse(r.shownEvidence) : [],
      timelineProgress: r.timelineProgress || 0,
      wrongAccusations: r.wrongAccusations ?? 0,
      deliveredHintIds: r.deliveredHintIds ? JSON.parse(r.deliveredHintIds) : [],
      notes: JSON.parse(r.notes),
      boardConnections: JSON.parse(r.boardConnections),
      evidenceAnalyses: JSON.parse(r.evidenceAnalyses),
      startTime: r.startTime,
      lastPlayed: r.lastPlayed,
      playTime: r.playTime,
      lastSaved: r.lastSaved || r.lastPlayed,
    };
  }

  getGame(gameId: string): GameState | null {
    const row = this.db.prepare('SELECT * FROM games WHERE gameId = ?').get(gameId);
    if (!row) return null;
    return this.parseGameRow(row);
  }

  getPlayerGames(playerId: string): GameState[] {
    const rows = this.db.prepare('SELECT * FROM games WHERE playerId = ? ORDER BY lastPlayed DESC').all(playerId);
    return (rows as any[]).map(row => this.parseGameRow(row));
  }

  getGameByPlayerAndCase(playerId: string, caseId: string): GameState | null {
    const row = this.db.prepare(
      'SELECT * FROM games WHERE playerId = ? AND caseId = ? LIMIT 1'
    ).get(playerId, caseId);
    if (!row) return null;
    return this.parseGameRow(row);
  }

  // Memory operations
  saveMemory(memory: Memory): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories 
      (id, playerId, brainId, type, content, caseId, npcId, importance, tags, timestamp, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      memory.id,
      memory.playerId,
      memory.brainId,
      memory.type,
      JSON.stringify(memory.content),
      memory.caseId || null,
      memory.npcId || null,
      memory.importance,
      JSON.stringify(memory.tags),
      memory.timestamp,
      memory.updatedAt || null
    );
  }

  getMemory(id: string): Memory | null {
    const row = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
    if (!row) return null;
    const r = row as any;
    return {
      id: r.id,
      playerId: r.playerId,
      brainId: r.brainId,
      type: r.type,
      content: JSON.parse(r.content),
      caseId: r.caseId,
      npcId: r.npcId,
      importance: r.importance,
      tags: JSON.parse(r.tags),
      timestamp: r.timestamp,
      updatedAt: r.updatedAt,
    };
  }

  getPlayerMemories(
    playerId: string,
    filters?: { type?: string; caseId?: string; npcId?: string; limit?: number }
  ): Memory[] {
    let query = 'SELECT * FROM memories WHERE playerId = ?';
    const params: any[] = [playerId];

    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters?.caseId) {
      query += ' AND caseId = ?';
      params.push(filters.caseId);
    }

    if (filters?.npcId) {
      query += ' AND npcId = ?';
      params.push(filters.npcId);
    }

    query += ' ORDER BY timestamp DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = this.db.prepare(query).all(...params);
    return (rows as any[]).map(row => ({
      id: row.id,
      playerId: row.playerId,
      brainId: row.brainId,
      type: row.type,
      content: JSON.parse(row.content),
      caseId: row.caseId,
      npcId: row.npcId,
      importance: row.importance,
      tags: JSON.parse(row.tags),
      timestamp: row.timestamp,
      updatedAt: row.updatedAt,
    }));
  }

  deleteMemory(id: string): void {
    this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
  }

  deleteGame(gameId: string): void {
    this.db.prepare('DELETE FROM games WHERE gameId = ?').run(gameId);
  }

  deleteCase(caseId: string): void {
    // First delete associated games
    this.db.prepare('DELETE FROM games WHERE caseId = ?').run(caseId);
    // Then delete the case
    this.db.prepare('DELETE FROM cases WHERE id = ?').run(caseId);
  }

  deletePlayer(playerId: string): void {
    // First delete all associated memories
    this.db.prepare('DELETE FROM memories WHERE playerId = ?').run(playerId);
    // Then delete all associated games
    this.db.prepare('DELETE FROM games WHERE playerId = ?').run(playerId);
    // Then delete all associated cases
    this.db.prepare('DELETE FROM cases WHERE playerId = ?').run(playerId);
    // Finally delete the player
    this.db.prepare('DELETE FROM players WHERE id = ?').run(playerId);
  }
}

export const dbService = new DBService();
