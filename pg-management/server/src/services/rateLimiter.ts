import { prisma } from '../index.js';

// BUG #7 FIX: Rate limiting is now DB-backed by querying MessageLog counts
// instead of using an in-memory map. This means rate limits persist across
// server restarts, crashes, and deploys. The MessageLog is the single source
// of truth for how many messages were sent in each time window.
//
// Trade-off: each sendWhatsAppMessage call now makes 3 DB count queries.
// For a small PG management app this is acceptable. If performance becomes
// an issue, add a Redis layer in front of these counts.

function getLimits(userId: string): Promise<{ maxPerMinute: number; maxPerHour: number; maxPerDay: number }> {
  return prisma.messageLimit.upsert({
    where: { ownerId: userId },
    update: {},
    create: { ownerId: userId },
    select: { maxPerMinute: true, maxPerHour: true, maxPerDay: true },
  });
}

export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getLimits(userId);
  const now = new Date();

  const oneMinuteAgo = new Date(now.getTime() - 60_000);
  const oneHourAgo = new Date(now.getTime() - 3_600_000);
  const oneDayAgo = new Date(now.getTime() - 86_400_000);

  // FIX: Count only SENT messages (PENDING messages don't count as they were either
  // retried and succeeded, or failed - they shouldn't consume rate limit quota)
  const [minuteCount, hourCount, dayCount] = await Promise.all([
    prisma.messageLog.count({
      where: { ownerId: userId, sentAt: { gte: oneMinuteAgo }, status: 'SENT' },
    }),
    prisma.messageLog.count({
      where: { ownerId: userId, sentAt: { gte: oneHourAgo }, status: 'SENT' },
    }),
    prisma.messageLog.count({
      where: { ownerId: userId, sentAt: { gte: oneDayAgo }, status: 'SENT' },
    }),
  ]);

  if (minuteCount >= limits.maxPerMinute) {
    return { allowed: false, reason: `Max ${limits.maxPerMinute} messages per minute reached` };
  }
  if (hourCount >= limits.maxPerHour) {
    return { allowed: false, reason: `Max ${limits.maxPerHour} messages per hour reached` };
  }
  if (dayCount >= limits.maxPerDay) {
    return { allowed: false, reason: `Max ${limits.maxPerDay} messages per day reached` };
  }

  return { allowed: true };
}
