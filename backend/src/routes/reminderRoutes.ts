import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getReminderSettings, updateReminderSettings } from '../controllers/reminderController';

const router = Router();

// Get reminder settings
router.get('/settings', authenticate, getReminderSettings);

// Update reminder settings
router.put('/settings', authenticate, updateReminderSettings);

export default router;
