import { v4 as uuidv4 } from 'uuid';
import { Case } from '../types';
import { llmClient, normalizeLLMCase } from '../config/openai';
import { dbService } from './databaseService';
import { isCaseTooSimilar } from './caseSimilarityService';
import { generateProceduralCase, validateCase } from './proceduralCaseEngine';
import logger from '../config/logger';

const caseCache = new Map<string, Case>();
const generationLocks = new Map<string, Promise<Case>>();
const MAX_GENERATION_ATTEMPTS = 3;
const SIMILARITY_THRESHOLD = 0.2;

export class CaseService {
  private cases: Map<string, Case> = caseCache;

  async getCase(caseId: string): Promise<Case | null> {
    if (this.cases.has(caseId)) {
      return this.cases.get(caseId)!;
    }

    const dbCase = dbService.getCase(caseId);
    if (dbCase) {
      this.cases.set(caseId, dbCase);
      return dbCase;
    }

    return null;
  }

  async getPlayerCases(playerId: string): Promise<Case[]> {
    const dbCases = dbService.getPlayerCases(playerId);
    dbCases.forEach(c => this.cases.set(c.id, c));
    return dbCases;
  }

  async generateCase(params: {
    difficulty: string;
    crimeType: string;
    location?: string;
    playerId: string;
  }): Promise<Case> {
    const lockKey = `${params.playerId}-${Date.now()}`;
    const existing = generationLocks.get(params.playerId);
    if (existing) {
      logger.info('Case generation already in progress, waiting for existing promise', { playerId: params.playerId });
      return existing;
    }

    const promise = this.generateCaseInternal(params).finally(() => {
      generationLocks.delete(params.playerId);
    });

    generationLocks.set(params.playerId, promise);
    logger.info('Case generation lock acquired', { playerId: params.playerId, lockKey });
    return promise;
  }

  private async generateCaseInternal(params: {
    difficulty: string;
    crimeType: string;
    location?: string;
    playerId: string;
  }): Promise<Case> {
    logger.info('Starting case generation', {
      playerId: params.playerId,
      difficulty: params.difficulty,
      crimeType: params.crimeType,
      location: params.location
    });

    const previousCases = await this.getPlayerCases(params.playerId);
    const avoidNames = previousCases.flatMap(c => [
      c.victimName,
      ...c.suspects.map(s => s.name),
      ...c.witnesses.map(w => w.name),
    ]);
    const avoidTitles = previousCases.map(c => c.title);

    let caseData: Omit<Case, 'id' | 'playerId' | 'createdAt' | 'status'> | null = null;

    let llmFailed = false;

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      try {
        logger.info('Case generation attempt', { attempt: attempt + 1, usingLLM: llmClient.isAvailable() && !llmFailed });
        if (llmClient.isAvailable() && !llmFailed) {
          const raw = await llmClient.generateCase({
            ...params,
            avoidNames,
            avoidTitles,
            attempt,
          });
          caseData = normalizeLLMCase(raw, params);
        } else {
          logger.info('Falling back to procedural case generation', { attempt: attempt + 1 });
          caseData = generateProceduralCase({ ...params, seed: `${Date.now()}-${attempt}` });
        }

        const candidate: Case = {
          ...caseData,
          id: uuidv4(),
          playerId: params.playerId,
          status: 'active',
          createdAt: new Date().toISOString(),
        };

        // Validate case before returning
        const validation = validateCase(candidate);
        if (!validation.isValid) {
          logger.warn('Case validation failed, regenerating...', { 
            caseId: candidate.id, 
            errors: validation.errors 
          });
          throw new Error(`Case validation failed: ${validation.errors.join(', ')}`);
        }

        if (!isCaseTooSimilar(candidate, previousCases, SIMILARITY_THRESHOLD)) {
          logger.info('Case generated successfully', {
            caseId: candidate.id,
            playerId: params.playerId,
            title: candidate.title
          });
          this.cases.set(candidate.id, candidate);
          dbService.saveCase(candidate, params.playerId);
          return candidate;
        }

        logger.info('Case too similar to previous, regenerating...', { attempt: attempt + 1 });
      } catch (error: any) {
        logger.warn('Case generation attempt failed', {
          attempt: attempt + 1,
          error: error?.message || error,
        });
        llmFailed = true;
        caseData = generateProceduralCase({ ...params, seed: `${Date.now()}-fallback-${attempt}` });
      }
    }

    // Final procedural case — guaranteed unique enough after attempts
    logger.info('Using final procedural fallback case');
    const finalData = caseData || generateProceduralCase({ ...params, seed: `${Date.now()}-final` });
    const newCase: Case = {
      ...finalData,
      id: uuidv4(),
      playerId: params.playerId,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.cases.set(newCase.id, newCase);
    dbService.saveCase(newCase, params.playerId);
    logger.info('Final procedural case saved', { caseId: newCase.id, playerId: params.playerId });
    return newCase;
  }

  async updateCase(caseId: string, updates: Partial<Case>): Promise<Case | null> {
    const gameCase = await this.getCase(caseId);
    if (!gameCase) return null;

    const updated = { ...gameCase, ...updates };
    this.cases.set(caseId, updated);
    dbService.saveCase(updated, updated.playerId!);
    return updated;
  }

  async updateCaseStatus(caseId: string, status: string): Promise<Case | null> {
    const gameCase = await this.getCase(caseId);
    if (!gameCase) return null;

    gameCase.status = status as Case['status'];
    if (status === 'solved') gameCase.completedAt = new Date().toISOString();

    this.cases.set(caseId, gameCase);
    dbService.saveCase(gameCase, gameCase.playerId!);
    return gameCase;
  }

  async solveCase(caseId: string, solution: { culpritId: string; method?: string; evidence?: string[] }): Promise<{ correct: boolean; explanation: string }> {
    const gameCase = await this.getCase(caseId);
    if (!gameCase) throw new Error('Case not found');

    const correct = solution.culpritId === gameCase.solution.culpritId;
    const culprit = gameCase.suspects.find(s => s.id === gameCase.solution.culpritId);

    return {
      correct,
      explanation: correct
        ? `Correct! ${culprit?.name} committed the crime. ${gameCase.solution.method} ${gameCase.ending}`
        : `Incorrect. The killer was ${culprit?.name}. ${gameCase.solution.motive}`,
    };
  }

  async getHint(caseId: string, params: { discoveredClues: string[]; stuckDuration: number }): Promise<{ hint: string | null }> {
    const gameCase = await this.getCase(caseId);
    if (!gameCase) throw new Error('Case not found');

    const undiscovered = gameCase.clues.filter(c => !params.discoveredClues.includes(c.id));
    if (undiscovered.length > 0) {
      const clue = undiscovered.find(c => c.importance === 'critical' || c.importance === 'high') || undiscovered[0];
      return { hint: `${clue.name} at ${clue.location}: ${clue.description}` };
    }

    const uncollectedKey = gameCase.solution.keyEvidence.filter(id => !params.discoveredClues.includes(id));
    for (const evId of uncollectedKey) {
      const ev = gameCase.evidence.find(e => e.id === evId);
      if (ev) return { hint: `Key evidence pending collection: ${ev.name}. ${ev.description}` };
    }

    return { hint: null };
  }
}
