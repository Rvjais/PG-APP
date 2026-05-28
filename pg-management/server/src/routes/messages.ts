import { Router } from 'express';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { sendWhatsAppMessage } from '../services/whatsapp.js';
import { parseTemplate } from '../services/message.js';

const router = Router();

router.use(authMiddleware);

router.post('/send', async (req: AuthRequest, res) => {
  try {
    const { tenantId, message, imageBase64 } = req.body;
    if (!tenantId || !message) {
      return res.status(400).json({ error: 'Tenant ID and message are required' });
    }

    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, ownerId: req.userId },
      include: { building: { select: { name: true } } },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { name: true },
    });

    const parsedMessage = parseTemplate(
      message,
      tenant,
      user?.name || 'Owner',
      tenant.building?.name || 'Your PG'
    );

    const status = await sendWhatsAppMessage(req.userId!, tenant.phone, parsedMessage, imageBase64);

    await prisma.messageLog.create({
      data: {
        ownerId: req.userId!,
        tenantId: tenant.id,
        messageContent: parsedMessage,
        imageData: imageBase64 || null,
        status,
      },
    });

    res.json({ status, tenantId, message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.post('/bulk', async (req: AuthRequest, res) => {
  try {
    const { tenantIds, buildingId, floor, message, imageBase64 } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const where: any = { ownerId: req.userId, isActive: true };
    if (buildingId) where.buildingId = buildingId;
    if (floor) { const f = parseInt(floor); if (!isNaN(f)) where.floor = f; }
    if (tenantIds && tenantIds.length > 0) where.id = { in: tenantIds };

    const tenants = await prisma.tenant.findMany({
      where,
      include: { building: { select: { name: true } }, owner: { select: { name: true } } },
    });

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { name: true },
    });

    const ownerName = user?.name || 'Owner';

    const results = await Promise.allSettled(
      tenants.map(async (tenant) => {
        const parsedMessage = parseTemplate(
          message,
          tenant,
          ownerName,
          tenant.building?.name || 'Your PG'
        );

        const status = await sendWhatsAppMessage(req.userId!, tenant.phone, parsedMessage, imageBase64);
        await prisma.messageLog.create({
          data: {
            ownerId: req.userId!,
            tenantId: tenant.id,
            messageContent: parsedMessage,
            imageData: imageBase64 || null,
            status,
          },
        });
        return { tenantId: tenant.id, name: tenant.name, status };
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    res.json({
      total: tenants.length,
      successful,
      failed,
      results: results.map((r) =>
        r.status === 'fulfilled' ? r.value : { error: r.reason }
      ),
    });
  } catch (error) {
    console.error('Bulk send error:', error);
    res.status(500).json({ error: 'Failed to send bulk messages' });
  }
});

router.get('/logs', async (req: AuthRequest, res) => {
  try {
    const { tenantId, limit = 50, cursor } = req.query;
    const parsedLimit = Math.min(parseInt(limit as string, 10) || 50, 200);

    const where: any = { ownerId: req.userId };
    if (tenantId) where.tenantId = tenantId as string;

    // BUG #8 FIX: add cursor-based pagination for message logs
    const logs = await prisma.messageLog.findMany({
      where,
      include: {
        tenant: {
          select: { id: true, name: true, phone: true, roomNumber: true },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: parsedLimit + 1, // Fetch one extra to determine if there's a next page
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 }),
    });

    // Check if there are more results
    const hasMore = logs.length > parsedLimit;
    if (hasMore) logs.pop();

    const nextCursor = hasMore && logs.length > 0 ? logs[logs.length - 1].id : null;

    res.json({
      logs,
      pagination: {
        hasMore,
        nextCursor,
        limit: parsedLimit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;