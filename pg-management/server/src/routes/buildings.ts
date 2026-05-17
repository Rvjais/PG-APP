import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const buildings = await prisma.building.findMany({
      where: { ownerId: req.userId },
      include: {
        _count: {
          select: { tenants: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(buildings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const building = await prisma.building.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
      include: {
        tenants: {
          where: { isActive: true },
          orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
        },
      },
    });
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }
    res.json(building);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch building' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, address } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const building = await prisma.building.create({
      data: {
        name,
        address,
        ownerId: req.userId!,
      },
    });
    res.status(201).json(building);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create building' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, address } = req.body;
    const building = await prisma.building.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    const updated = await prisma.building.update({
      where: { id: req.params.id },
      data: { name, address },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update building' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const building = await prisma.building.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    await prisma.building.delete({ where: { id: req.params.id } });
    res.json({ message: 'Building deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete building' });
  }
});

export default router;