import cron from 'node-cron';
import { prisma } from '../index.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import { parseTemplate } from './message.js';

export function startScheduler(): void {
  cron.schedule('0 9 * * *', () => {
    console.log('Running scheduled reminder check...');
    processScheduledReminders().catch((err) => console.error('Fixed date reminder error:', err));
  });

  // BUG #9 FIX: runs every 5 min, but sendSingleReminder now checks
  // lastSentAt on the reminder before sending to prevent duplicates.
  cron.schedule('*/5 * * * *', () => {
    checkRelativeReminders().catch((err) => console.error('Relative reminder error:', err));
  });

  console.log('Scheduler started');
}

export async function triggerAllReminders(): Promise<{ processed: number; skipped: number }> {
  const fixedResult = await processScheduledReminders();
  const relativeResult = await checkRelativeReminders();
  return {
    processed: fixedResult.processed + relativeResult.processed,
    skipped: fixedResult.skipped + relativeResult.skipped,
  };
}

function isWithinTimeWindow(sendFrom?: string | null, sendUntil?: string | null): boolean {
  if (!sendFrom && !sendUntil) return true;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const from = sendFrom ? toMinutes(sendFrom) : 0;
  const until = sendUntil ? toMinutes(sendUntil) : 24 * 60 - 1;
  return currentMinutes >= from && currentMinutes <= until;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

async function processScheduledReminders(): Promise<{ processed: number; skipped: number }> {
  const today = new Date();
  const dayOfMonth = today.getDate();

  let processed = 0;
  let skipped = 0;

  try {
    const reminders = await prisma.scheduledReminder.findMany({
      where: {
        isActive: true,
        triggerType: 'FIXED_DATE',
      },
      include: {
        template: true,
        building: true,
      },
    });

    for (const reminder of reminders) {
      if (!isWithinTimeWindow(reminder.sendFrom, reminder.sendUntil)) {
        console.log(`Reminder ${reminder.id} outside time window, skipping.`);
        skipped++;
        continue;
      }

      const tv = parseInt(reminder.triggerValue);
      if (isNaN(tv) || tv !== dayOfMonth) {
        skipped++;
        continue;
      }

      // BUG #9 FIX: check if this reminder already fired today
      if (reminder.lastSentAt) {
        const lastSentDay = new Date(reminder.lastSentAt);
        lastSentDay.setHours(0, 0, 0, 0);
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        if (lastSentDay.getTime() === todayStart.getTime()) {
          console.log(`Reminder ${reminder.id} already sent today, skipping.`);
          skipped++;
          continue;
        }
      }

      await sendReminderToTenants(reminder);
      processed++;
    }
  } catch (error) {
    console.error('Error processing fixed date reminders:', error);
  }

  return { processed, skipped };
}

async function checkRelativeReminders(): Promise<{ processed: number; skipped: number }> {
  let processed = 0;
  let skipped = 0;

  try {
    const reminders = await prisma.scheduledReminder.findMany({
      where: {
        isActive: true,
        triggerType: 'RELATIVE_TO_JOIN',
      },
      include: {
        template: true,
        building: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const reminder of reminders) {
      if (!isWithinTimeWindow(reminder.sendFrom, reminder.sendUntil)) {
        skipped++;
        continue;
      }

      const daysOffset = parseInt(reminder.triggerValue);
      if (isNaN(daysOffset)) {
        skipped++;
        continue;
      }

      // BUG #9 FIX: skip if this reminder already fired today
      if (reminder.lastSentAt) {
        const lastSentDay = new Date(reminder.lastSentAt);
        lastSentDay.setHours(0, 0, 0, 0);
        if (lastSentDay.getTime() === today.getTime()) {
          skipped++;
          continue; // Already processed today — skip all 5-min ticks
        }
      }

      const tenantsWhere: any = {
        isActive: true,
        ownerId: reminder.ownerId,
      };

      if (reminder.buildingId) {
        tenantsWhere.buildingId = reminder.buildingId;
      }

      const tenants = await prisma.tenant.findMany({ where: tenantsWhere });

      let didSendToAnyone = false;

      for (const tenant of tenants) {
        if (!tenant.joinDate) continue;

        const targetDate = new Date(tenant.joinDate);
        targetDate.setDate(targetDate.getDate() + daysOffset);
        targetDate.setHours(0, 0, 0, 0);

        if (targetDate.getTime() !== today.getTime()) continue;

        await sendSingleReminder(reminder, tenant);
        didSendToAnyone = true;
        processed++;
      }

      if (!didSendToAnyone) {
        skipped++;
      }

      // FIX: Always update lastSentAt when a reminder is processed (not just when
      // tenants matched), to record that this reminder fired today
      await prisma.scheduledReminder.update({
        where: { id: reminder.id },
        data: { lastSentAt: new Date() },
      });
    }
  } catch (error) {
    console.error('Error checking relative reminders:', error);
  }

  return { processed, skipped };
}

async function sendReminderToTenants(reminder: any): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: reminder.ownerId },
    select: { name: true },
  });

  const where: any = {
    isActive: true,
    ownerId: reminder.ownerId,
  };

  if (reminder.buildingId) {
    where.buildingId = reminder.buildingId;
  }

  const tenants = await prisma.tenant.findMany({ where });

  for (const tenant of tenants) {
    await sendSingleReminder(reminder, tenant, user?.name);
  }

  // FIX: Always update lastSentAt to record this reminder was processed today,
  // even if no tenants matched (prevents duplicate processing on next cron tick)
  await prisma.scheduledReminder.update({
    where: { id: reminder.id },
    data: { lastSentAt: new Date() },
  });
}

async function sendSingleReminder(reminder: any, tenant: any, ownerName?: string): Promise<void> {
  try {
    if (!ownerName) {
      const user = await prisma.user.findUnique({
        where: { id: reminder.ownerId },
        select: { name: true },
      });
      ownerName = user?.name || 'PG Owner';
    }

    const buildingName = reminder.building?.name || 'Your PG';

    const message = parseTemplate(
      reminder.template.templateText,
      tenant,
      ownerName,
      buildingName
    );

    const status = await sendWhatsAppMessage(reminder.ownerId, tenant.phone, message);

    await prisma.messageLog.create({
      data: {
        ownerId: reminder.ownerId,
        tenantId: tenant.id,
        messageContent: message,
        status,
      },
    });
  } catch (error) {
    console.error(`Failed to send reminder to tenant ${tenant.id}:`, error);
  }
}

export async function triggerReminderNow(reminderId: string): Promise<{ sent: number; failed: number }> {
  const reminder = await prisma.scheduledReminder.findUnique({
    where: { id: reminderId },
    include: { template: true, building: true },
  });

  if (!reminder) {
    throw new Error('Reminder not found');
  }

  const user = await prisma.user.findUnique({
    where: { id: reminder.ownerId },
    select: { name: true },
  });

  const where: any = {
    isActive: true,
    ownerId: reminder.ownerId,
  };

  if (reminder.buildingId) {
    where.buildingId = reminder.buildingId;
  }

  const tenants = await prisma.tenant.findMany({ where });

  let sent = 0;
  let failed = 0;

  for (const tenant of tenants) {
    try {
      const message = parseTemplate(
        reminder.template.templateText,
        tenant,
        user?.name || 'PG Owner',
        reminder.building?.name || 'Your PG'
      );

      const status = await sendWhatsAppMessage(reminder.ownerId, tenant.phone, message);

      await prisma.messageLog.create({
        data: {
          ownerId: reminder.ownerId,
          tenantId: tenant.id,
          messageContent: message,
          status,
        },
      });

      if (status === 'SENT') sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  // Update lastSentAt after manual trigger too
  await prisma.scheduledReminder.update({
    where: { id: reminderId },
    data: { lastSentAt: new Date() },
  });

  return { sent, failed };
}