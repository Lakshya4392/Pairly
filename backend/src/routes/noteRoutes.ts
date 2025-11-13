import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendSharedNote, getRecentNotes, deleteNote } from '../controllers/noteController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Send a shared note
router.post('/send', sendSharedNote);

// Get recent notes
router.get('/recent', getRecentNotes);

// Delete a note
router.delete('/:noteId', deleteNote);

export default router;
