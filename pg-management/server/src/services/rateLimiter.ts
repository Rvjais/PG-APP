import { prisma } from '../index.js';

interface SlidingWindow {
  timestamps: number[];
}

const windows: Map<string, SlidingWindow> = new Map();
const CLEANUP_INTERVAL = 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [key, w] of windows) {
    w.timestamps = w.timestamps.filter(t => now - t < 86400_000);
    if (w.timestamps.length === 0) windows.delete(key);
  }
}, CLEANUP_INTERVAL);

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
  const now = Date.now();
  let w = windows.get(userId);
  if (!w) {
    w = { timestamps: [] };
    windows.set(userId, w);
  }
  w.timestamps = w.timestamps.filter(t => now - t < 86400_000);

  const oneMinuteAgo = now - 60_000;
  const oneHourAgo = now - 3600_000;
  const minuteCount = w.timestamps.filter(t => t > oneMinuteAgo).length;
  const hourCount = w.timestamps.filter(t => t > oneHourAgo).length;
  const dayCount = w.timestamps.length;

  if (minuteCount >= limits.maxPerMinute) {
    return { allowed: false, reason: `Max ${limits.maxPerMinute} messages per minute reached` };
  }
  if (hourCount >= limits.maxPerHour) {
    return { allowed: false, reason: `Max ${limits.maxPerHour} messages per hour reached` };
  }
  if (dayCount >= limits.maxPerDay) {
    return { allowed: false, reason: `Max ${limits.maxPerDay} messages per day reached` };
  }

  w.timestamps.push(now);
  return { allowed: true };
}
