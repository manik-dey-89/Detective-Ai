import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logger from './logger';

class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'detective_ai.db');
  }

  initialize(): Database.Database {
    if (this.db) return this.db;

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.createTables();
    logger.info('Database initialized successfully');
    return this.db;
  }

  private createTables() {
    if (!this.db) return;

    // Players table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brainId TEXT NOT NULL,
        statistics TEXT NOT NULL,
        reputation TEXT NOT NULL,
        achievements TEXT NOT NULL,
        settings TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Add brainId column to existing players if it doesn't exist
    const playerColumns = (this.db.prepare('PRAGMA table_info(players)').all() as any[]).map(c => c.name);
    if (!playerColumns.includes('brainId')) {
      this.db.exec('ALTER TABLE players ADD COLUMN brainId TEXT');
    }

    // Cases table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        playerId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        crimeType TEXT NOT NULL,
        location TEXT NOT NULL,
        country TEXT,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        completedAt TEXT,
        victim TEXT,
        victimName TEXT,
        victimDetails TEXT,
        twist TEXT,
        ending TEXT,
        suspects TEXT NOT NULL,
        witnesses TEXT NOT NULL,
        clues TEXT NOT NULL,
        evidence TEXT NOT NULL,
        timeline TEXT NOT NULL,
        solution TEXT NOT NULL,
        FOREIGN KEY (playerId) REFERENCES players(id)
      )
    `);

    // Migrate existing cases table
    this.migrateCasesTable();

    // Games table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        gameId TEXT PRIMARY KEY,
        caseId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        currentLocation TEXT NOT NULL,
        phase TEXT NOT NULL,
        discoveredClues TEXT NOT NULL,
        collectedEvidence TEXT NOT NULL,
        interviewedNPCs TEXT NOT NULL,
        interrogationHistory TEXT NOT NULL DEFAULT '{}',
        shownEvidence TEXT NOT NULL DEFAULT '[]',
        notes TEXT NOT NULL,
        boardConnections TEXT NOT NULL,
        evidenceAnalyses TEXT NOT NULL,
        startTime TEXT NOT NULL,
        lastPlayed TEXT NOT NULL,
        playTime INTEGER NOT NULL,
        lastSaved TEXT,
        timelineProgress INTEGER DEFAULT 0,
        wrongAccusations INTEGER DEFAULT 0,
        deliveredHintIds TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY (caseId) REFERENCES cases(id),
        FOREIGN KEY (playerId) REFERENCES players(id)
      )
    `);

    // Migrate existing games table
    this.migrateGamesTable();

    // Memories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        playerId TEXT NOT NULL,
        brainId TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        caseId TEXT,
        npcId TEXT,
        importance INTEGER NOT NULL,
        tags TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        updatedAt TEXT,
        FOREIGN KEY (playerId) REFERENCES players(id)
      )
    `);

    // Add brainId column to existing memories table if needed
    const memoryColumns = (this.db.prepare('PRAGMA table_info(memories)').all() as any[]).map(c => c.name);
    if (!memoryColumns.includes('brainId')) {
      this.db.exec('ALTER TABLE memories ADD COLUMN brainId TEXT');
    }

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cases_playerId ON cases(playerId);
      CREATE INDEX IF NOT EXISTS idx_games_playerId ON games(playerId);
      CREATE INDEX IF NOT EXISTS idx_games_caseId ON games(caseId);
      CREATE INDEX IF NOT EXISTS idx_games_player_case ON games(playerId, caseId);
      CREATE INDEX IF NOT EXISTS idx_memories_playerId ON memories(playerId);
      CREATE INDEX IF NOT EXISTS idx_memories_caseId ON memories(caseId);
      CREATE INDEX IF NOT EXISTS idx_memories_npcId ON memories(npcId);
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
    `);

    this.validateSchema();
  }

  private getTableColumns(table: string): string[] {
    if (!this.db) return [];
    return (this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name);
  }

  private addColumnIfMissing(table: 'games' | 'cases', name: string, def: string): void {
    if (!this.db) return;
    if (this.getTableColumns(table).includes(name)) return;
    try {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
      logger.info(`Added missing column: ${table}.${name}`);
    } catch (e: any) {
      logger.error(`Could not add column ${table}.${name}: ${e?.message || e}`, { error: e });
      throw e;
    }
  }

  private migrateGamesTable() {
    if (!this.db) return;
    this.addColumnIfMissing('games', 'interrogationHistory', "TEXT NOT NULL DEFAULT '{}'");
    this.addColumnIfMissing('games', 'shownEvidence', "TEXT NOT NULL DEFAULT '[]'");
    this.addColumnIfMissing('games', 'lastSaved', 'TEXT');
    this.addColumnIfMissing('games', 'timelineProgress', 'INTEGER DEFAULT 0');
    this.addColumnIfMissing('games', 'wrongAccusations', 'INTEGER DEFAULT 0');
    this.addColumnIfMissing('games', 'deliveredHintIds', "TEXT NOT NULL DEFAULT '[]'");
  }

  private migrateCasesTable() {
    if (!this.db) return;
    this.addColumnIfMissing('cases', 'country', 'TEXT');
    this.addColumnIfMissing('cases', 'victim', 'TEXT');
    this.addColumnIfMissing('cases', 'victimName', 'TEXT');
    this.addColumnIfMissing('cases', 'victimDetails', 'TEXT');
    this.addColumnIfMissing('cases', 'twist', 'TEXT');
    this.addColumnIfMissing('cases', 'ending', 'TEXT');
  }

  private validateSchema() {
    const required: Record<string, string[]> = {
      games: ['interrogationHistory', 'shownEvidence', 'wrongAccusations', 'deliveredHintIds'],
      cases: ['country', 'victim', 'victimName', 'victimDetails', 'twist', 'ending'],
    };

    for (const [table, cols] of Object.entries(required)) {
      const existing = new Set(this.getTableColumns(table));
      const missing = cols.filter(c => !existing.has(c));
      if (missing.length > 0) {
        throw new Error(`Database schema out of date: ${table} missing columns: ${missing.join(', ')}`);
      }
    }
  }

  getDB(): Database.Database {
    return this.initialize();
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const databaseService = new DatabaseService();
