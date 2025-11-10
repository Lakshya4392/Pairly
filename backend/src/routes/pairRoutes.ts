import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { generateCode, joinWithCode, disconnect } from '../controllers/pairController';

const router = Router();

// All pairing routes require authentication
router.use(authenticate);

// POST /pairs/generate-code - Generate invite code
router.post('/generate-code', generateCode);

// POST /pairs/join - Join with invite code
router.post('/join', joinWithCode);

// DELETE /pairs/disconnect - Disconnect from partner
router.delete('/disconnect', disconnect);

export default router;
