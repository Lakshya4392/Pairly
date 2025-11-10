import { Router, Request, Response } from 'express';

const router = Router();

// Test endpoint to verify mobile can reach backend
router.get('/ping', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Backend is reachable!',
    timestamp: new Date().toISOString(),
    ip: req.ip,
  });
});

// Test sync endpoint
router.post('/test-sync', async (req: Request, res: Response) => {
  try {
    console.log('📱 Test sync request received');
    console.log('Body:', req.body);
    
    res.json({
      success: true,
      message: 'Test sync successful',
      receivedData: req.body,
    });
  } catch (error: any) {
    console.error('Test sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
