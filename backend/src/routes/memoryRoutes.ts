import { Router, Request, Response } from 'express';
import { MemoryController } from '../controllers/memoryController';

const router = Router();
const memoryController = new MemoryController();

// Remember - store a memory
router.post('/remember', memoryController.remember);

// Recall - retrieve memories
router.post('/recall', memoryController.recall);

// Memify - improve/update a memory
router.put('/memify/:id', memoryController.memify);

// Forget - delete a memory
router.delete('/forget/:id', memoryController.forget);

// Get related memories
router.get('/related/:id', memoryController.getRelated);

// Get NPC memories
router.get('/npc/:npcId', memoryController.getNPCMemories);

// Clear all memories for a player
router.delete('/player/:playerId', memoryController.clearPlayerMemories);

export default router;
