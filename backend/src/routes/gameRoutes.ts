import { Router, Request, Response } from 'express';
import { GameController } from '../controllers/gameController';

const router = Router();
const gameController = new GameController();

// Get player's games
router.get('/player/:playerId', gameController.getPlayerGames);

router.post('/:gameId/playtime', gameController.incrementPlayTime);

// Start a new game
router.post('/start', gameController.startGame);

// Get current game state
router.get('/state/:gameId', gameController.getGameState);

// Update game state
router.patch('/state/:gameId', gameController.updateGameState);

// Discover a clue
router.post('/:gameId/clues', gameController.discoverClue);

// Collect evidence
router.post('/:gameId/evidence', gameController.collectEvidence);

// Interview NPC
router.post('/:gameId/interview', gameController.interviewNPC);

// Add note
router.post('/:gameId/notes', gameController.addNote);

// Add board connection
router.post('/:gameId/connections', gameController.addConnection);

// Analyze evidence
router.post('/:gameId/analyze', gameController.analyzeEvidence);

// Auto-save game
router.post('/:gameId/auto-save', gameController.autoSave);

// Load game
router.get('/load/:saveId', gameController.loadGame);

// Delete save
router.delete('/:gameId', gameController.deleteGame);

// Investigation status & hints
router.get('/:gameId/investigation-status', gameController.getInvestigationStatus);
router.post('/:gameId/hint', gameController.requestHint);
router.post('/:gameId/timeline-reviewed', gameController.markTimelineReviewed);

// Make accusation
router.post('/:gameId/accuse', gameController.makeAccusation);

export default router;
