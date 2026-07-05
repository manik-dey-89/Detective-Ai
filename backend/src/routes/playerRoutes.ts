import { Router, Request, Response } from 'express';
import { PlayerController } from '../controllers/playerController';

const router = Router();
const playerController = new PlayerController();

// Get all players
router.get('/', playerController.getAllPlayers);

// Login or create player
router.post('/login', playerController.loginOrCreatePlayer);

// Create new player
router.post('/', playerController.createPlayer);

// Get player profile
router.get('/:id', playerController.getPlayer);

// Update player profile
router.patch('/:id', playerController.updatePlayer);

// Update player statistics
router.patch('/:id/stats', playerController.updateStatistics);

// Get player achievements
router.get('/:id/achievements', playerController.getAchievements);

// Unlock achievement
router.post('/:id/achievements', playerController.unlockAchievement);

// Update player reputation
router.patch('/:id/reputation', playerController.updateReputation);

// Get player memory visualization
router.get('/:id/memory-graph', playerController.getMemoryGraph);

// Save player progress
router.post('/:id/save', playerController.saveProgress);

// Load player progress
router.get('/:id/load', playerController.loadProgress);

// Delete player
router.delete('/:id', playerController.deletePlayer);

export default router;
