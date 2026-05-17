import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const fields = await prisma.customField.findMany({
      where: { ownerId: req.userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(fields);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom fields' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { fieldName, fieldType, fieldOptions, isRequired } = req.body;
    if (!fieldName) {
      return res.status(400).json({ error: 'Field name is required' });
    }

    const VALID_FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'SELECT'];
    const normalizedFieldType = fieldType || 'TEXT';
    if (!VALID_FIELD_TYPES.includes(normalizedFieldType)) {
      return res.status(400).json({ error: 'Invalid field type' });
    }

    const field = await prisma.customField.create({
      data: {
        fieldName,
        fieldType: normalizedFieldType,
        fieldOptions: fieldOptions || null,
        isRequired: isRequired || false,
        ownerId: req.userId!,
      },
    });
    res.status(201).json(field);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create custom field' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { fieldName, fieldType, fieldOptions, isRequired } = req.body;
    const field = await prisma.customField.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const updated = await prisma.customField.update({
      where: { id: req.params.id },
      data: { fieldName, fieldType, fieldOptions, isRequired },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update custom field' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const field = await prisma.customField.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    await prisma.customField.delete({ where: { id: req.params.id } });
    res.json({ message: 'Field deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete custom field' });
  }
});

export default router;