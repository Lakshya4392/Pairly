import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadMoment, getLatestMoment, getAllMoments, deleteMoment } from '../controllers/momentController';
import { addReaction, getReactions } from '../controllers/reactionController';

const router = Router();

// All moment routes require authentication
router.use(authenticate);

// POST /moments/upload - Upload photo moment
router.post('/upload', upload.single('photo'), uploadMoment);

// GET /moments/latest - Get latest moment from partner
router.get('/latest', getLatestMoment);

// GET /moments/all - Get all moments for memories screen
router.get('/all', getAllMoments);

// DELETE /moments/:id - Permanently delete a moment (DB + Cloudinary)
router.delete('/:id', deleteMoment);

// POST /moments/:id/react - Add reaction to moment (from widget)
router.post('/:id/react', addReaction);

// GET /moments/:id/reactions - Get all reactions for a moment
router.get('/:id/reactions', getReactions);

export default router;
