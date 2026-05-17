import { Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from './auth.js';

export async function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch {
    return res.status(500).json({ error: 'Failed to verify admin' });
  }
}
