import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/message-limits', async (req: AuthRequest, res) => {
  try {
    const limits = await prisma.messageLimit.upsert({
      where: { ownerId: req.userId! },
      update: {},
      create: { ownerId: req.userId! },
    });
    res.json(limits);
  } catch (error) {
    console.error('Failed to fetch message limits:', error);
    res.status(500).json({ error: 'Failed to fetch message limits' });
  }
});

router.put('/message-limits', async (req: AuthRequest, res) => {
  try {
    const { maxPerMinute, maxPerHour, maxPerDay } = req.body;
    if (maxPerMinute < 1 || maxPerHour < 1 || maxPerDay < 1) {
      return res.status(400).json({ error: 'All limits must be at least 1' });
    }
    if (maxPerMinute > maxPerHour || maxPerHour > maxPerDay) {
      return res.status(400).json({ error: 'Limits must follow: perMinute ≤ perHour ≤ perDay' });
    }
    const limits = await prisma.messageLimit.upsert({
      where: { ownerId: req.userId! },
      update: { maxPerMinute, maxPerHour, maxPerDay },
      create: { ownerId: req.userId!, maxPerMinute, maxPerHour, maxPerDay },
    });
    res.json(limits);
  } catch (error) {
    console.error('Failed to update message limits:', error);
    res.status(500).json({ error: 'Failed to update message limits' });
  }
});

export default router;
