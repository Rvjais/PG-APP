import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { parseTemplate } from '../services/message.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const templates = await prisma.messageTemplate.findMany({
      where: { ownerId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, templateText } = req.body;
    if (!name || !templateText) {
      return res.status(400).json({ error: 'Name and template text are required' });
    }

    const template = await prisma.messageTemplate.create({
      data: {
        name,
        templateText,
        ownerId: req.userId!,
      },
    });
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, templateText } = req.body;
    const template = await prisma.messageTemplate.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const updated = await prisma.messageTemplate.update({
      where: { id: req.params.id },
      data: { name, templateText },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const template = await prisma.messageTemplate.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await prisma.messageTemplate.delete({ where: { id: req.params.id } });
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

router.post('/:id/preview', async (req: AuthRequest, res) => {
  try {
    const { tenantId } = req.body;
    const template = await prisma.messageTemplate.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, ownerId: req.userId },
      include: {
        building: { select: { name: true } },
      },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { name: true },
    });

    const preview = parseTemplate(template.templateText, tenant, user?.name || 'Owner', tenant.building?.name || 'Your PG');
    res.json({ preview, template: template.templateText });
  } catch (error) {
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

export default router;