import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import {
  connectWhatsApp,
  disconnectWhatsApp,
  getConnectionStatus,
  getQRCode,
} from '../services/whatsapp.js';

const router = Router();

router.use(authMiddleware);

router.get('/status', async (req: AuthRequest, res) => {
  try {
    const status = getConnectionStatus(req.userId!);
    const qrCode = getQRCode(req.userId!);

    res.json({
      status,
      qrCode,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

router.post('/connect', async (req: AuthRequest, res) => {
  try {
    const result = await connectWhatsApp(req.userId!, true);
    res.json(result);
  } catch (error) {
    console.error('Connect error:', error);
    res.status(500).json({ error: 'Failed to connect WhatsApp' });
  }
});

router.post('/disconnect', async (req: AuthRequest, res) => {
  try {
    await disconnectWhatsApp(req.userId!);
    res.json({ status: 'disconnected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

router.get('/qr', async (req: AuthRequest, res) => {
  try {
    const qr = getQRCode(req.userId!);
    res.json({ qrCode: qr });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

export default router;