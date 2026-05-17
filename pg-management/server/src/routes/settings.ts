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
    // BUG #6 FIX: parse as integers first before any comparison or DB write
    const maxPerMinute = parseInt(req.body.maxPerMinute, 10);
    const maxPerHour = parseInt(req.body.maxPerHour, 10);
    const maxPerDay = parseInt(req.body.maxPerDay, 10);

    if (isNaN(maxPerMinute) || isNaN(maxPerHour) || isNaN(maxPerDay)) {
      return res.status(400).json({ error: 'All limits must be valid numbers' });
    }
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

// BUG #16 FIX: profile update endpoint so whatsappNumber (and name) are writable
router.put('/profile', async (req: AuthRequest, res) => {
  try {
    const { name, whatsappNumber } = req.body;

    if (name !== undefined && typeof name !== 'string') {
      return res.status(400).json({ error: 'Name must be a string' });
    }
    if (whatsappNumber !== undefined && whatsappNumber !== null && typeof whatsappNumber !== 'string') {
      return res.status(400).json({ error: 'WhatsApp number must be a string' });
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(whatsappNumber !== undefined && { whatsappNumber: whatsappNumber || null }),
      },
      select: { id: true, email: true, name: true, whatsappNumber: true, isAdmin: true },
    });
    res.json(updated);
  } catch (error) {
    console.error('Failed to update profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
