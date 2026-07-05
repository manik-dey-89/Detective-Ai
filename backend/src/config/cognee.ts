import dotenv from 'dotenv';
import axios from 'axios';
import logger from './logger';

dotenv.config();

class CogneeClient {
  private baseUrl: string;
  private apiKey: string;
  private initialized = false;
  private localMemoryCache: Map<string, any> = new Map();

  constructor() {
    this.baseUrl = process.env.COGNEE_BASE_URL || 'https://api.cognee.ai';
    this.apiKey = process.env.COGNEE_API_KEY || '';
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    logger.info('Cognee client initialized');
  }

  private getJsonHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
    };
  }

  private getDatasetName(brainId: string, caseId?: string) {
    if (caseId) {
      return `detective-ai-${brainId}-case-${caseId}`;
    }
    return `detective-ai-${brainId}`;
  }

  async remember(data: {
    playerId: string;
    brainId: string;
    type: string;
    content: any;
    caseId?: string;
    npcId?: string;
    importance?: number;
    tags?: string[];
  }) {
    await this.initialize();

    const memory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      timestamp: new Date().toISOString(),
      importance: data.importance || 5,
      tags: data.tags || [],
    };

    logger.info('Cognee remember called', { 
      playerId: data.playerId, 
      brainId: data.brainId, 
      caseId: data.caseId, 
      memoryId: memory.id, 
      type: data.type 
    });

    // Store in local cache
    this.localMemoryCache.set(memory.id, memory);

    // Store in Cognee
    try {
      const datasetName = this.getDatasetName(data.brainId, data.caseId);
      logger.debug('Cognee dataset', { datasetName });
      
      // First, add the data to Cognee using JSON body
      await axios.post(
        `${this.baseUrl}/api/v1/add`,
        {
          data: JSON.stringify(memory),
          datasetName: datasetName,
        },
        {
          headers: this.getJsonHeaders(),
        }
      );

      // Then cognify to build the knowledge graph
      await axios.post(
        `${this.baseUrl}/api/v1/cognify`,
        {
          datasets: [datasetName],
        },
        { headers: this.getJsonHeaders() }
      );
      logger.info('Cognee memory stored successfully', { memoryId: memory.id, datasetName });
    } catch (error) {
      logger.error('Error storing memory in Cognee:', { error });
      // Fallback to local cache if Cognee fails
    }

    return memory;
  }

  async recall(query: {
    playerId: string;
    brainId: string;
    type?: string;
    caseId?: string;
    npcId?: string;
    keywords?: string[];
    limit?: number;
  }) {
    await this.initialize();

    logger.info('Cognee recall called', { 
      playerId: query.playerId, 
      brainId: query.brainId, 
      caseId: query.caseId, 
      type: query.type 
    });

    // First check local cache
    let results = Array.from(this.localMemoryCache.values()).filter(
      (m) => m.brainId === query.brainId
    );

    if (query.type) {
      results = results.filter((m) => m.type === query.type);
    }
    if (query.caseId) {
      results = results.filter((m) => m.caseId === query.caseId);
    }
    if (query.npcId) {
      results = results.filter((m) => m.npcId === query.npcId);
    }
    if (query.keywords && query.keywords.length > 0) {
      const keywordLower = query.keywords.map((k) => k.toLowerCase());
      results = results.filter((m) =>
        keywordLower.some((k) =>
          JSON.stringify(m.content).toLowerCase().includes(k) ||
          m.tags.some((t: string) => t.toLowerCase().includes(k))
        )
      );
    }

    // Try to search Cognee for more results
    try {
      const datasetName = this.getDatasetName(query.brainId, query.caseId);
      const searchQuery = query.keywords?.join(' ') || query.type || 'memory';
      logger.debug('Cognee searching dataset', { datasetName, searchQuery });
      
      const cogneeResponse = await axios.post<Array<{ search_result: string }>>(
        `${this.baseUrl}/api/v1/search`,
        {
          searchType: 'CHUNKS',
          datasets: [datasetName],
          query: searchQuery,
          topK: query.limit || 10,
        },
        { headers: this.getJsonHeaders() }
      );

      // Parse Cognee results
      const cogneeResults = cogneeResponse.data.map((item) => {
        try {
          return JSON.parse(item.search_result);
        } catch {
          return item.search_result;
        }
      }).filter(m => m.brainId === query.brainId);

      // Merge with local cache results
      results = [...new Map([...results, ...cogneeResults].map(m => [m.id, m])).values()];
      logger.info('Cognee recall found memories', { count: results.length });
    } catch (error) {
      logger.error('Error recalling from Cognee:', { error });
      // Just use local cache
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

  async memify(memoryId: string, improvements: Record<string, any>) {
    await this.initialize();

    const memory = this.localMemoryCache.get(memoryId);
    if (!memory) throw new Error('Memory not found');

    logger.info('Cognee memify called', { 
      playerId: memory.playerId, 
      brainId: memory.brainId, 
      memoryId 
    });

    const updatedMemory = {
      ...memory,
      ...improvements,
      content: improvements.content || memory.content,
      importance: improvements.importance || memory.importance,
      tags: improvements.tags || memory.tags,
      updatedAt: new Date().toISOString(),
    };

    this.localMemoryCache.set(memoryId, updatedMemory);

    // Update in Cognee
    try {
      const datasetName = this.getDatasetName(memory.brainId, memory.caseId);
      
      // Add updated memory
      await axios.post(
        `${this.baseUrl}/api/v1/add`,
        {
          data: JSON.stringify(updatedMemory),
          datasetName: datasetName,
        },
        {
          headers: this.getJsonHeaders(),
        }
      );

      // Cognify
      await axios.post(
        `${this.baseUrl}/api/v1/cognify`,
        {
          datasets: [datasetName],
        },
        { headers: this.getJsonHeaders() }
      );
      logger.info('Cognee memory updated successfully', { memoryId });
    } catch (error) {
      logger.error('Error updating memory in Cognee:', { error });
    }

    return updatedMemory;
  }

  async forget(memoryId: string) {
    await this.initialize();

    const memory = this.localMemoryCache.get(memoryId);
    if (memory) {
      logger.info('Cognee forget called', { 
        playerId: memory.playerId, 
        brainId: memory.brainId, 
        memoryId 
      });
    }

    this.localMemoryCache.delete(memoryId);
    return { success: true, message: 'Memory forgotten' };
  }

  async getRelatedMemories(memoryId: string, limit = 5) {
    await this.initialize();

    const memory = this.localMemoryCache.get(memoryId);
    if (!memory) return [];

    logger.info('Cognee get related memories called', { 
      playerId: memory.playerId, 
      brainId: memory.brainId, 
      memoryId 
    });

    // Find related memories based on tags and content similarity
    const related = Array.from(this.localMemoryCache.values())
      .filter((m) => m.id !== memoryId && m.brainId === memory.brainId)
      .filter((m) => {
        // Check for shared tags
        const sharedTags = m.tags.filter((t: string) => memory.tags.includes(t));
        if (sharedTags.length > 0) return true;

        // Check for same case or NPC
        if (m.caseId === memory.caseId) return true;
        if (m.npcId === memory.npcId) return true;

        return false;
      })
      .slice(0, limit);

    logger.info('Cognee found related memories', { count: related.length });
    return related;
  }

  async deleteAllMemoriesForBrain(brainId: string) {
    await this.initialize();
    logger.info('Cognee delete all memories called', { brainId });
    
    // Delete from local cache
    let deletedLocal = 0;
    for (const [id, mem] of this.localMemoryCache.entries()) {
      if (mem.brainId === brainId) {
        this.localMemoryCache.delete(id);
        deletedLocal++;
      }
    }
    logger.info('Cognee deleted local memories', { count: deletedLocal });

    // Try to delete from Cognee (using dataset names)
    try {
      // First, list all possible dataset names we might have used for this brain
      // From getDatasetName: detective-ai-{brainId} and detective-ai-{brainId}-case-*
      const baseDataset = this.getDatasetName(brainId);
      
      // Try to delete base dataset
      try {
        await axios.delete(`${this.baseUrl}/api/v1/datasets/${encodeURIComponent(baseDataset)}`, {
          headers: this.getJsonHeaders()
        });
        logger.info('Cognee deleted base dataset', { baseDataset });
      } catch (e) {
        logger.debug('Cognee base dataset might not exist', { baseDataset });
      }

      // We don't have a way to list all case datasets, but delete any we know about by pattern
      // For now, rely on local cache and note that if case-specific datasets exist,
      // they might need to be handled if we track them
      logger.debug('Cognee case-specific datasets would follow pattern', { pattern: `detective-ai-${brainId}-case-*` });
      
      return { success: true, deletedLocal };
    } catch (error) {
      logger.error('Error deleting memories from Cognee:', { error });
      throw new Error('Failed to delete Cognee memories for brain');
    }
  }
}

export const cogneeClient = new CogneeClient();
