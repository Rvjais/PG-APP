import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { buildingId, floor, isActive } = req.query;
    const where: any = { ownerId: req.userId };

    if (buildingId) where.buildingId = buildingId as string;
    if (floor) { const f = parseInt(floor as string); if (!isNaN(f)) where.floor = f; }
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        building: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ building: { name: 'asc' } }, { floor: 'asc' }, { roomNumber: 'asc' }],
    });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
      include: {
        building: {
          select: { id: true, name: true, address: true },
        },
      },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { buildingId, name, phone, roomNumber, floor, rentAmount, joinDate, customFieldValues } = req.body;

    if (!buildingId || !name || !phone || !roomNumber) {
      return res.status(400).json({ error: 'Building, name, phone, and room number are required' });
    }

    const building = await prisma.building.findFirst({
      where: { id: buildingId, ownerId: req.userId },
    });
    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        buildingId,
        ownerId: req.userId!,
        name,
        phone,
        roomNumber,
        floor: floor !== undefined && floor !== null ? floor : 1,
        rentAmount: rentAmount !== undefined && rentAmount !== null ? (() => { const v = parseFloat(rentAmount); return isNaN(v) ? null : v; })() : null,
        joinDate: joinDate ? new Date(joinDate) : null,
        customFieldValues: customFieldValues || {},
      },
      include: {
        building: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(tenant);
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { buildingId, name, phone, roomNumber, floor, rentAmount, joinDate, isActive, customFieldValues } = req.body;

    const tenant = await prisma.tenant.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const updated = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        buildingId,
        name,
        phone,
        roomNumber,
        floor: floor !== undefined ? floor : tenant.floor,
        rentAmount: rentAmount !== undefined
          ? (() => { const v = parseFloat(rentAmount); return isNaN(v) ? null : v; })()
          : tenant.rentAmount,
        joinDate: joinDate !== undefined ? new Date(joinDate) : tenant.joinDate,
        isActive: isActive !== undefined ? isActive : tenant.isActive,
        customFieldValues: customFieldValues !== undefined ? customFieldValues : tenant.customFieldValues,
      },
      include: {
        building: { select: { id: true, name: true } },
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await prisma.tenant.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tenant deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

export default router;