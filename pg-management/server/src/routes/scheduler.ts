import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/reminders', async (req: AuthRequest, res) => {
  try {
    const reminders = await prisma.scheduledReminder.findMany({
      where: { ownerId: req.userId },
      include: {
        template: { select: { id: true, name: true, templateText: true } },
        building: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

router.post('/reminders', async (req: AuthRequest, res) => {
  try {
    const { templateId, buildingId, triggerType, triggerValue, isActive = true, sendFrom, sendUntil } = req.body;

    if (!templateId || !triggerType || !triggerValue) {
      return res.status(400).json({ error: 'Template, trigger type, and trigger value are required' });
    }

    const VALID_TRIGGER_TYPES = ['FIXED_DATE', 'RELATIVE_TO_JOIN'] as const;
    if (!VALID_TRIGGER_TYPES.includes(triggerType as typeof VALID_TRIGGER_TYPES[number])) {
      return res.status(400).json({ error: 'Invalid trigger type' });
    }

    // BUG FIX: Validate FIXED_DATE triggerValue is in valid range (1-31)
    if (triggerType === 'FIXED_DATE') {
      const day = parseInt(triggerValue, 10);
      if (isNaN(day) || day < 1 || day > 31) {
        return res.status(400).json({ error: 'Day of month must be between 1 and 31' });
      }
    }

    if (sendFrom && !/^\d{2}:\d{2}$/.test(sendFrom)) {
      return res.status(400).json({ error: 'sendFrom must be in HH:MM format' });
    }
    if (sendUntil && !/^\d{2}:\d{2}$/.test(sendUntil)) {
      return res.status(400).json({ error: 'sendUntil must be in HH:MM format' });
    }

    const template = await prisma.messageTemplate.findFirst({
      where: { id: templateId, ownerId: req.userId },
    });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (buildingId) {
      const building = await prisma.building.findFirst({
        where: { id: buildingId, ownerId: req.userId },
      });
      if (!building) {
        return res.status(404).json({ error: 'Building not found' });
      }
    }

    const reminder = await prisma.scheduledReminder.create({
      data: {
        templateId,
        buildingId: buildingId || null,
        triggerType: triggerType as 'FIXED_DATE' | 'RELATIVE_TO_JOIN',
        triggerValue,
        isActive,
        sendFrom: sendFrom || null,
        sendUntil: sendUntil || null,
        ownerId: req.userId!,
      },
      include: {
        template: { select: { id: true, name: true, templateText: true } },
        building: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(reminder);
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

router.put('/reminders/:id', async (req: AuthRequest, res) => {
  try {
    const { templateId, buildingId, triggerType, triggerValue, isActive, sendFrom, sendUntil } = req.body;

    const VALID_TRIGGER_TYPES = ['FIXED_DATE', 'RELATIVE_TO_JOIN'] as const;
    if (triggerType && !VALID_TRIGGER_TYPES.includes(triggerType as typeof VALID_TRIGGER_TYPES[number])) {
      return res.status(400).json({ error: 'Invalid trigger type' });
    }

    if (sendFrom !== undefined && sendFrom !== '' && !/^\d{2}:\d{2}$/.test(sendFrom)) {
      return res.status(400).json({ error: 'sendFrom must be in HH:MM format' });
    }
    if (sendUntil !== undefined && sendUntil !== '' && !/^\d{2}:\d{2}$/.test(sendUntil)) {
      return res.status(400).json({ error: 'sendUntil must be in HH:MM format' });
    }

    const reminder = await prisma.scheduledReminder.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // BUG FIX: Validate FIXED_DATE triggerValue is in valid range (1-31)
    const effectiveTriggerType = triggerType ?? reminder.triggerType;
    const effectiveTriggerValue = triggerValue ?? reminder.triggerValue;
    if (effectiveTriggerType === 'FIXED_DATE') {
      const day = parseInt(effectiveTriggerValue, 10);
      if (isNaN(day) || day < 1 || day > 31) {
        return res.status(400).json({ error: 'Day of month must be between 1 and 31' });
      }
    }

    const updated = await prisma.scheduledReminder.update({
      where: { id: req.params.id },
      data: {
        templateId: templateId ?? reminder.templateId,
        buildingId: buildingId !== undefined ? buildingId : reminder.buildingId,
        triggerType: triggerType ?? reminder.triggerType,
        triggerValue: triggerValue ?? reminder.triggerValue,
        isActive: isActive ?? reminder.isActive,
        sendFrom: sendFrom !== undefined ? (sendFrom || null) : reminder.sendFrom,
        sendUntil: sendUntil !== undefined ? (sendUntil || null) : reminder.sendUntil,
      },
      include: {
        template: { select: { id: true, name: true, templateText: true } },
        building: { select: { id: true, name: true } },
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

router.delete('/reminders/:id', async (req: AuthRequest, res) => {
  try {
    const reminder = await prisma.scheduledReminder.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    await prisma.scheduledReminder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Reminder deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

export default router;