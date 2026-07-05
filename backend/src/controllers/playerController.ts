import { Request, Response } from 'express';
import { PlayerService, playerService } from '../services/playerService';
import { ApiResponse } from '../types';
import logger from '../config/logger';

export class PlayerController {
  private playerService: PlayerService;

  constructor() {
    this.playerService = playerService;
  }

  getAllPlayers = async (req: Request, res: Response) => {
    try {
      const players = await this.playerService.getAllPlayers();
      const response: ApiResponse<typeof players> = {
        success: true,
        data: players
      };
      res.json(response);
    } catch (error) {
      logger.error('Error getting players:', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get players'
      });
    }
  };

  loginOrCreatePlayer = async (req: Request, res: Response) => {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: name'
        });
      }

      const player = await this.playerService.getOrLoginPlayer(name);

      const response: ApiResponse<typeof player> = {
        success: true,
        data: player,
        message: player.createdAt === player.updatedAt ? 'Player created successfully' : 'Player logged in successfully'
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error logging in/creating player:', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to login or create player'
      });
    }
  };

  createPlayer = async (req: Request, res: Response) => {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: name'
        });
      }

      const player = await this.playerService.createPlayer(name);

      const response: ApiResponse<typeof player> = {
        success: true,
        data: player,
        message: 'Player created successfully'
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error creating player:', { error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create player'
      });
    }
  };

  getPlayer = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const player = await this.playerService.getPlayer(id);

      if (!player) {
        return res.status(404).json({
          success: false,
          error: 'Player not found'
        });
      }

      const response: ApiResponse<typeof player> = {
        success: true,
        data: player
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting player:', { error, playerId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to get player'
      });
    }
  };

  updatePlayer = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedPlayer = await this.playerService.updatePlayer(id, updates);

      const response: ApiResponse<typeof updatedPlayer> = {
        success: true,
        data: updatedPlayer,
        message: 'Player updated successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error updating player:', { error, playerId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update player'
      });
    }
  };

  updateStatistics = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { stats } = req.body;

      const updatedPlayer = await this.playerService.updateStatistics(id, stats);

      const response: ApiResponse<typeof updatedPlayer> = {
        success: true,
        data: updatedPlayer,
        message: 'Statistics updated successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error updating statistics:', { error, playerId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update statistics'
      });
    }
  };

  getAchievements = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const achievements = await this.playerService.getAchievements(id);

      const response: ApiResponse<typeof achievements> = {
        success: true,
        data: achievements
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting achievements:', { error, playerId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to get achievements'
      });
    }
  };

  unlockAchievement = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { achievementId } = req.body;

      if (!achievementId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: achievementId'
        });
      }

      const achievement = await this.playerService.unlockAchievement(id, achievementId);

      const response: ApiResponse<typeof achievement> = {
        success: true,
        data: achievement,
        message: 'Achievement unlocked!'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error unlocking achievement:', { error, playerId: req.params.id, achievementId: req.body.achievementId });
      res.status(500).json({
        success: false,
        error: 'Failed to unlock achievement'
      });
    }
  };

  updateReputation = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { points, organization } = req.body;

      const updatedPlayer = await this.playerService.updateReputation(id, points, organization);

      const response: ApiResponse<typeof updatedPlayer> = {
        success: true,
        data: updatedPlayer,
        message: 'Reputation updated successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error updating reputation:', { error, playerId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update reputation'
      });
    }
  };

  getMemoryGraph = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const memoryGraph = await this.playerService.getMemoryGraph(id);

      const response: ApiResponse<typeof memoryGraph> = {
        success: true,
        data: memoryGraph
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting memory graph:', { error, playerId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to get memory graph'
      });
    }
  };

  saveProgress = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { gameState } = req.body;

      const saveData = await this.playerService.saveProgress(id, gameState);

      const response: ApiResponse<typeof saveData> = {
        success: true,
        data: saveData,
        message: 'Progress saved successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error saving progress:', { error, playerId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to save progress'
      });
    }
  };

  loadProgress = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const saveData = await this.playerService.loadProgress(id);

      if (!saveData) {
        return res.status(404).json({
          success: false,
          error: 'No save data found'
        });
      }

      const response: ApiResponse<typeof saveData> = {
        success: true,
        data: saveData
      };

      res.json(response);
    } catch (error) {
      logger.error('Error loading progress:', { error, playerId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to load progress'
      });
    }
  };

  deletePlayer = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.playerService.deletePlayer(id);
      res.json({
        success: true,
        message: 'Detective deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting player:', { error, playerId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to delete detective'
      });
    }
  };
}
