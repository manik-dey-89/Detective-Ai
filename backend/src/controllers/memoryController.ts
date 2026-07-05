import { Request, Response } from 'express';
import { MemoryService } from '../services/memoryService';
import { ApiResponse } from '../types';
import logger from '../config/logger';

export class MemoryController {
  private memoryService: MemoryService;

  constructor() {
    this.memoryService = new MemoryService();
  }

  remember = async (req: Request, res: Response) => {
    try {
      const { playerId, type, content, caseId, npcId, importance, tags } = req.body;

      if (!playerId || !type || !content) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: playerId, type, content'
        });
      }

      const memory = await this.memoryService.remember({
        playerId,
        type,
        content,
        caseId,
        npcId,
        importance,
        tags,
      });

      const response: ApiResponse<typeof memory> = {
        success: true,
        data: memory,
        message: 'Memory stored successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error storing memory:', { error, playerId: req.body.playerId });
      res.status(500).json({
        success: false,
        error: 'Failed to store memory'
      });
    }
  };

  recall = async (req: Request, res: Response) => {
    try {
      const { playerId, type, caseId, npcId, keywords, limit } = req.body;

      if (!playerId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: playerId'
        });
      }

      const memories = await this.memoryService.recall({
        playerId,
        type,
        caseId,
        npcId,
        keywords,
        limit,
      });

      const response: ApiResponse<typeof memories> = {
        success: true,
        data: memories
      };

      res.json(response);
    } catch (error) {
      logger.error('Error recalling memories:', { error, playerId: req.body.playerId });
      res.status(500).json({
        success: false,
        error: 'Failed to recall memories'
      });
    }
  };

  memify = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { improvements } = req.body;

      if (!improvements) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: improvements'
        });
      }

      const updatedMemory = await this.memoryService.memify(id, improvements);

      const response: ApiResponse<typeof updatedMemory> = {
        success: true,
        data: updatedMemory,
        message: 'Memory updated successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error updating memory:', { error, memoryId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update memory'
      });
    }
  };

  forget = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await this.memoryService.forget(id);

      const response: ApiResponse<void> = {
        success: true,
        message: 'Memory forgotten successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error forgetting memory:', { error, memoryId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to forget memory'
      });
    }
  };

  getRelated = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit } = req.query;

      const relatedMemories = await this.memoryService.getRelatedMemories(
        id,
        parseInt(limit as string) || 5
      );

      const response: ApiResponse<typeof relatedMemories> = {
        success: true,
        data: relatedMemories
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting related memories:', { error, memoryId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to get related memories'
      });
    }
  };

  getNPCMemories = async (req: Request, res: Response) => {
    try {
      const { npcId } = req.params;
      const { playerId } = req.query;

      if (!playerId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required query parameter: playerId'
        });
      }

      const memories = await this.memoryService.recall({
        playerId: playerId as string,
        npcId,
      });

      const response: ApiResponse<typeof memories> = {
        success: true,
        data: memories
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting NPC memories:', { error, npcId: req.params.npcId, playerId: req.query.playerId });
      res.status(500).json({
        success: false,
        error: 'Failed to get NPC memories'
      });
    }
  };

  clearPlayerMemories = async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;

      await this.memoryService.clearPlayerMemories(playerId);

      const response: ApiResponse<void> = {
        success: true,
        message: 'Player memories cleared successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error clearing player memories:', { error, playerId: req.params.playerId });
      res.status(500).json({
        success: false,
        error: 'Failed to clear player memories'
      });
    }
  };
}
