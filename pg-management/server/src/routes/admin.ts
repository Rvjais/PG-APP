import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', async (_req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', async (req: AuthRequest, res) => {
  try {
    const { email, name, isAdmin } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: name || '',
        password: '',
        isAdmin: isAdmin || false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Failed to create user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { email, name, isAdmin } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(email !== undefined && { email }),
        ...(name !== undefined && { name }),
        ...(isAdmin !== undefined && { isAdmin }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
