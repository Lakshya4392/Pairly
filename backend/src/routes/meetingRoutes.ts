import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    setMeetingCountdown,
    getMeetingCountdown,
    clearMeetingCountdown,
} from '../controllers/meetingController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Set meeting countdown (POST /meeting/countdown)
router.post('/countdown', setMeetingCountdown);

// Get meeting countdown (GET /meeting/countdown)
router.get('/countdown', getMeetingCountdown);

// Clear meeting countdown (DELETE /meeting/countdown)
router.delete('/countdown', clearMeetingCountdown);

export default router;
