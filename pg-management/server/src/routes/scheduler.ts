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
    const { templateId, buildingId, triggerType, triggerValue, isActive = true } = req.body;

    if (!templateId || !triggerType || !triggerValue) {
      return res.status(400).json({ error: 'Template, trigger type, and trigger value are required' });
    }

    const VALID_TRIGGER_TYPES = ['FIXED_DATE', 'RELATIVE_TO_JOIN'] as const;
    if (!VALID_TRIGGER_TYPES.includes(triggerType as typeof VALID_TRIGGER_TYPES[number])) {
      return res.status(400).json({ error: 'Invalid trigger type' });
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
    const { templateId, buildingId, triggerType, triggerValue, isActive } = req.body;

    const VALID_TRIGGER_TYPES = ['FIXED_DATE', 'RELATIVE_TO_JOIN'] as const;
    if (triggerType && !VALID_TRIGGER_TYPES.includes(triggerType as typeof VALID_TRIGGER_TYPES[number])) {
      return res.status(400).json({ error: 'Invalid trigger type' });
    }

    const reminder = await prisma.scheduledReminder.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const updated = await prisma.scheduledReminder.update({
      where: { id: req.params.id },
      data: {
        templateId: templateId ?? reminder.templateId,
        buildingId: buildingId !== undefined ? buildingId : reminder.buildingId,
        triggerType: triggerType ?? reminder.triggerType,
        triggerValue: triggerValue ?? reminder.triggerValue,
        isActive: isActive ?? reminder.isActive,
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