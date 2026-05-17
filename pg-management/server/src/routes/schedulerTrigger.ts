import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { triggerReminderNow } from '../services/scheduler.js';

const router = Router();

router.use(authMiddleware);

router.post('/reminders/:id/trigger', async (req: AuthRequest, res) => {
  try {
    const reminder = await prisma.scheduledReminder.findUnique({
      where: { id: req.params.id },
      select: { ownerId: true },
    });
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    if (reminder.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const result = await triggerReminderNow(req.params.id);
    res.json({
      message: `Sent to ${result.sent} tenants`,
      successful: result.sent,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger reminder' });
  }
});

export default router;