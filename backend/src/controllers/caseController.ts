import { Request, Response } from 'express';
import { CaseService } from '../services/caseService';
import { GameService } from '../services/gameService';
import { ApiResponse } from '../types';
import logger from '../config/logger';

export class CaseController {
  private caseService: CaseService;

  constructor() {
    this.caseService = new CaseService();
  }

  generateAndStart = async (req: Request, res: Response) => {
    try {
      const { difficulty, crimeType, location, playerId } = req.body;

      if (!difficulty || !crimeType || !playerId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: difficulty, crimeType, playerId',
        });
      }

      const gameService = new GameService();
      const result = await gameService.generateAndStart({
        difficulty,
        crimeType,
        location,
        playerId,
      });

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Investigation started successfully',
      };

      res.json(response);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to start investigation';
      logger.error('Error starting investigation:', {
        error: errorMessage,
        playerId: req.body.playerId,
      });
      res.status(errorMessage.includes('not found') ? 404 : 500).json({
        success: false,
        error: errorMessage,
      });
    }
  };

  generateCase = async (req: Request, res: Response) => {
    try {
      const { difficulty, crimeType, location, playerId } = req.body;
      
      if (!difficulty || !crimeType || !playerId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: difficulty, crimeType, playerId'
        });
      }

      const newCase = await this.caseService.generateCase({
        difficulty,
        crimeType,
        location,
        playerId,
      });

      const response: ApiResponse<typeof newCase> = {
        success: true,
        data: newCase,
        message: 'Case generated successfully'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error generating case:', { error, playerId: req.body.playerId });
      res.status(500).json({
        success: false,
        error: 'Failed to generate case'
      });
    }
  };

  getCase = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const gameCase = await this.caseService.getCase(id);

      if (!gameCase) {
        return res.status(404).json({
          success: false,
          error: 'Case not found'
        });
      }

      const response: ApiResponse<typeof gameCase> = {
        success: true,
        data: gameCase
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting case:', { error, caseId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to get case'
      });
    }
  };

  getPlayerCases = async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      const cases = await this.caseService.getPlayerCases(playerId);

      const response: ApiResponse<typeof cases> = {
        success: true,
        data: cases
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting player cases:', { error, playerId: req.params.playerId });
      res.status(500).json({
        success: false,
        error: 'Failed to get player cases'
      });
    }
  };

  updateCaseStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['active', 'solved', 'failed'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      const updatedCase = await this.caseService.updateCaseStatus(id, status);

      const response: ApiResponse<typeof updatedCase> = {
        success: true,
        data: updatedCase,
        message: 'Case status updated'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error updating case status:', { error, caseId: req.params.id, status: req.body.status });
      res.status(500).json({
        success: false,
        error: 'Failed to update case status'
      });
    }
  };

  solveCase = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { culpritId, method, evidence } = req.body;

      const result = await this.caseService.solveCase(id, {
        culpritId,
        method,
        evidence,
      });

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: result.correct ? 'Case solved correctly!' : 'Incorrect solution'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error solving case:', { error, caseId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to solve case'
      });
    }
  };

  getHint = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { discoveredClues, stuckDuration } = req.query;

      const hintResult = await this.caseService.getHint(id, {
        discoveredClues: discoveredClues as string[],
        stuckDuration: parseInt(stuckDuration as string) || 0,
      });

      const response: ApiResponse<{ hint: string | null }> = {
        success: true,
        data: hintResult
      };

      res.json(response);
    } catch (error) {
      logger.error('Error getting hint:', { error, caseId: req.params.id });
      res.status(500).json({
        success: false,
        error: 'Failed to get hint'
      });
    }
  };
}
