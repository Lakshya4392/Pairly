import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { uploadMoment, getLatestMoment } from '../controllers/momentController';

const router = Router();

// All moment routes require authentication
router.use(authenticate);

// POST /moments/upload - Upload photo moment
router.post('/upload', upload.single('photo'), uploadMoment);

// GET /moments/latest - Get latest moment from partner
router.get('/latest', getLatestMoment);

export default router;
