import { Router, Request, Response } from 'express';
import { CaseController } from '../controllers/caseController';

const router = Router();
const caseController = new CaseController();

// Generate a new case and start game in one request
router.post('/generate-and-start', caseController.generateAndStart);

// Generate a new case
router.post('/generate', caseController.generateCase);

// Get a specific case
router.get('/:id', caseController.getCase);

// Get all cases for a player
router.get('/player/:playerId', caseController.getPlayerCases);

// Update case status
router.patch('/:id/status', caseController.updateCaseStatus);

// Submit case solution
router.post('/:id/solve', caseController.solveCase);

// Get case hint
router.get('/:id/hint', caseController.getHint);

export default router;
