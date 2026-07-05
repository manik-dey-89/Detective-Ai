import { Memory, MemoryQuery } from '../types';
import { cogneeClient } from '../config/cognee';
import { dbService } from './databaseService';

export class MemoryService {
  private memories: Map<string, Memory> = new Map();

  async remember(data: {
    playerId: string;
    type: string;
    content: any;
    caseId?: string;
    npcId?: string;
    importance?: number;
    tags?: string[];
  }): Promise<Memory> {
    // Get player to get brainId
    const player = dbService.getPlayer(data.playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Store in Cognee with brainId
    const cogneeMemory = await cogneeClient.remember({
      ...data,
      brainId: player.brainId,
    });

    // Store locally
    const memory: Memory = {
      id: cogneeMemory.id,
      type: data.type as any,
      content: data.content,
      timestamp: cogneeMemory.timestamp,
      playerId: data.playerId,
      brainId: player.brainId,
      caseId: data.caseId,
      npcId: data.npcId,
      importance: data.importance || 5,
      tags: data.tags || [],
    };

    this.memories.set(memory.id, memory);
    
    // Save to database
    dbService.saveMemory(memory);
    
    return memory;
  }

  async recall(query: {
    playerId: string;
    type?: string;
    caseId?: string;
    npcId?: string;
    keywords?: string[];
    limit?: number;
  }): Promise<Memory[]> {
    // Get player to get brainId
    const player = dbService.getPlayer(query.playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Query Cognee with brainId
    const cogneeMemories = await cogneeClient.recall({
      ...query,
      brainId: player.brainId,
    });

    // Query database
    let results = dbService.getPlayerMemories(query.playerId, {
      type: query.type,
      caseId: query.caseId,
      npcId: query.npcId,
      limit: query.limit || 50, // Get more for keyword filtering
    });

    // Update memory cache
    results.forEach(m => this.memories.set(m.id, m));

    // Filter by keywords if provided
    if (query.keywords && query.keywords.length > 0) {
      const keywordLower = query.keywords.map(k => k.toLowerCase());
      results = results.filter(m => 
        keywordLower.some(k => 
          JSON.stringify(m.content).toLowerCase().includes(k) ||
          m.tags.some(t => t.toLowerCase().includes(k))
        )
      );
    }

    // Sort by importance and recency
    results.sort((a, b) => {
      if (b.importance !== a.importance) {
        return b.importance - a.importance;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return results.slice(0, query.limit || 10);
  }

  async memify(memoryId: string, improvements: Record<string, any>): Promise<Memory> {
    // Update in Cognee
    await cogneeClient.memify(memoryId, improvements);

    // Update locally
    const memory = this.memories.get(memoryId);
    if (!memory) {
      throw new Error('Memory not found');
    }

    const updatedMemory: Memory = {
      ...memory,
      ...improvements,
      content: improvements.content || memory.content,
      importance: improvements.importance || memory.importance,
      tags: improvements.tags || memory.tags,
      updatedAt: new Date().toISOString(),
    };

    this.memories.set(memoryId, updatedMemory);
    
    // Save to database
    dbService.saveMemory(updatedMemory);
    
    return updatedMemory;
  }

  async forget(memoryId: string): Promise<void> {
    // Delete from Cognee
    await cogneeClient.forget(memoryId);

    // Delete locally
    this.memories.delete(memoryId);
    
    // Delete from database
    dbService.deleteMemory(memoryId);
  }

  async getRelatedMemories(memoryId: string, limit = 5): Promise<Memory[]> {
    // Get related from Cognee
    const related = await cogneeClient.getRelatedMemories(memoryId, limit);

    // Return local memories that match
    return related
      .map((r: any) => this.memories.get(r.id))
      .filter((m): m is Memory => m !== undefined);
  }

  async clearPlayerMemories(playerId: string): Promise<void> {
    // Get all player memories
    const playerMemories = await this.recall({ playerId });

    // Delete each memory
    for (const memory of playerMemories) {
      await this.forget(memory.id);
    }
  }
}
