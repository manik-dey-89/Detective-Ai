import { Request, Response } from 'express';
import { GameService } from '../services/gameService';
import { ApiResponse } from '../types';
import logger from '../config/logger';

export class GameController {
  private gameService: GameService;

  constructor() {
    this.gameService = new GameService();
  }

  getPlayerGames = async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      const games = await this.gameService.getPlayerGames(playerId);

      const response: ApiResponse<typeof games> = {
        success: true,
        data: games
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting player games:', { error, playerId: req.params.playerId });
      res.status(500).json({
        success: false,
        error: 'Failed to get player games'
      });
    }
  };

  incrementPlayTime = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { delta } = req.body;

      if (!delta || delta <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid delta seconds',
        });
      }

      const gameState = await this.gameService.incrementPlayTime(gameId, delta);

      const response: ApiResponse<typeof gameState> = {
        success: true,
        data: gameState,
      };

      res.json(response);
    } catch (error) {
      logger.error('Error updating play time:', { error, gameId: req.params.gameId });
      res.status(500).json({
        success: false,
        error: 'Failed to update play time',
      });
    }
  };

  startGame = async (req: Request, res: Response) => {
    try {
      const { caseId, playerId } = req.body;

      if (!caseId || !playerId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: caseId, playerId'
        });
      }

      const gameState = await this.gameService.startGame(caseId, playerId);

      const response: ApiResponse<typeof gameState> = {
        success: true,
        data: gameState,
        message: 'Game started successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error starting game:', { error, caseId: req.body.caseId, playerId: req.body.playerId });
      res.status(500).json({
        success: false,
        error: 'Failed to start game'
      });
    }
  };

  getGameState = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const gameState = await this.gameService.getGameState(gameId);

      if (!gameState) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }

      const response: ApiResponse<typeof gameState> = {
        success: true,
        data: gameState
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting game state:', { error, gameId: req.params.gameId });
      res.status(500).json({
        success: false,
        error: 'Failed to get game state'
      });
    }
  };

  updateGameState = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const updates = req.body;

      const updated = await this.gameService.updateGameState(gameId, updates);

      const response: ApiResponse<typeof updated> = {
        success: true,
        data: updated,
        message: 'Game state updated'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error updating game state:', { error, gameId: req.params.gameId });
      res.status(500).json({
        success: false,
        error: 'Failed to update game state'
      });
    }
  };

  discoverClue = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { clueId } = req.body;

      if (!clueId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: clueId'
        });
      }

      const result = await this.gameService.discoverClue(gameId, clueId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Clue discovered!',
      };

      res.json(response);
    } catch (error) {
      logger.error('Error discovering clue:', { error, gameId: req.params.gameId, clueId: req.body.clueId });
      res.status(500).json({
        success: false,
        error: 'Failed to discover clue'
      });
    }
  };

  collectEvidence = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { evidenceId } = req.body;

      if (!evidenceId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: evidenceId'
        });
      }

      const result = await this.gameService.collectEvidence(gameId, evidenceId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Evidence collected!',
      };

      res.json(response);
    } catch (error) {
      logger.error('Error collecting evidence:', { error, gameId: req.params.gameId, evidenceId: req.body.evidenceId });
      res.status(500).json({
        success: false,
        error: 'Failed to collect evidence'
      });
    }
  };

  interviewNPC = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { npcId, question, approach, evidenceId } = req.body;

      if (!npcId || !question) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: npcId, question'
        });
      }

      const result = await this.gameService.interviewNPC(gameId, npcId, question, approach, evidenceId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Interview completed'
      };

      res.json(response);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to interview NPC';
      logger.error('Error interviewing NPC:', {
        error: errorMessage,
        gameId: req.params.gameId,
        npcId: req.body.npcId,
      });
      res.status(errorMessage.includes('not found') ? 404 : 500).json({
        success: false,
        error: errorMessage
      });
    }
  };

  addNote = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { content, tags, relatedClues } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: content'
        });
      }

      const updated = await this.gameService.addNote(gameId, {
        content,
        tags,
        relatedClues,
      });

      const response: ApiResponse<typeof updated> = {
        success: true,
        data: updated,
        message: 'Note added'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error adding note:', { error, gameId: req.params.gameId });
      res.status(500).json({
        success: false,
        error: 'Failed to add note'
      });
    }
  };

  addConnection = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { from, to, type, description } = req.body;

      if (!from || !to || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: from, to, type'
        });
      }

      const result = await this.gameService.addConnection(gameId, {
        from,
        to,
        type,
        description,
        strength: 50,
      });

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Connection added',
      };

      res.json(response);
    } catch (error) {
      logger.error('Error adding connection:', { error, gameId: req.params.gameId });
      res.status(500).json({
        success: false,
        error: 'Failed to add connection'
      });
    }
  };

  analyzeEvidence = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { evidenceId, analysisType } = req.body;

      if (!evidenceId || !analysisType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: evidenceId, analysisType'
        });
      }

      const analysis = await this.gameService.analyzeEvidence(gameId, evidenceId, analysisType);

      const response: ApiResponse<typeof analysis> = {
        success: true,
        data: analysis,
        message: 'Analysis completed'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error analyzing evidence:', { error, gameId: req.params.gameId, evidenceId: req.body.evidenceId });
      res.status(500).json({
        success: false,
        error: 'Failed to analyze evidence'
      });
    }
  };

  autoSave = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const result = await this.gameService.autoSave(gameId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Auto-saved successfully'
      };

      res.json(response);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to auto-save';
      logger.error('Error auto-saving:', { error, gameId: req.params.gameId });
      res.status(errorMessage.includes('not found') ? 404 : 500).json({
        success: false,
        error: errorMessage
      });
    }
  };

  loadGame = async (req: Request, res: Response) => {
    try {
      const { saveId } = req.params;
      const result = await this.gameService.loadGame(saveId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Game loaded successfully'
      };

      res.json(response);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load game';
      logger.error('Error loading game:', { error, saveId: req.params.saveId });
      res.status(errorMessage.includes('not found') ? 404 : 500).json({
        success: false,
        error: errorMessage
      });
    }
  };

  deleteGame = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      await this.gameService.deleteGame(gameId);

      const response: ApiResponse<void> = {
        success: true,
        message: 'Game deleted successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error deleting game:', { error, gameId: req.params.gameId });
      res.status(500).json({
        success: false,
        error: 'Failed to delete game'
      });
    }
  };

  getInvestigationStatus = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const status = await this.gameService.getInvestigationStatus(gameId);

      const response: ApiResponse<typeof status> = {
        success: true,
        data: status,
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting investigation status:', { error, gameId: req.params.gameId });
      res.status(500).json({
        success: false,
        error: 'Failed to get investigation status',
      });
    }
  };

  requestHint = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { trigger } = req.body;
      const result = await this.gameService.requestHint(gameId, trigger || 'manual');

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (error) {
      logger.error('Error requesting hint:', { error, gameId: req.params.gameId });
      res.status(500).json({
        success: false,
        error: 'Failed to request hint',
      });
    }
  };

  markTimelineReviewed = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const result = await this.gameService.markTimelineReviewed(gameId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (error) {
      logger.error('Error marking timeline reviewed:', { error, gameId: req.params.gameId });
      res.status(500).json({
        success: false,
        error: 'Failed to update timeline progress',
      });
    }
  };

  makeAccusation = async (req: Request, res: Response) => {
    try {
      const { gameId } = req.params;
      const { suspectId } = req.body;

      if (!suspectId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: suspectId',
        });
      }

      const result = await this.gameService.makeAccusation(gameId, suspectId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: result.correct ? 'Case solved!' : (result.canRetry ? 'Wrong accusation — keep investigating' : 'Case closed'),
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error making accusation:', { error, gameId: req.params.gameId, suspectId: req.body.suspectId });
      const msg = error?.message || 'Failed to make accusation';
      res.status(msg.includes('Investigation incomplete') ? 400 : 500).json({
        success: false,
        error: msg,
      });
    }
  };
}
