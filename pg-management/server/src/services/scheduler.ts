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

async function processScheduledReminders(): Promise<void> {
  const today = new Date();
  const dayOfMonth = today.getDate();

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
      const tv = parseInt(reminder.triggerValue);
      if (isNaN(tv) || tv !== dayOfMonth) continue;

      // BUG #9 FIX: check if this reminder already fired today
      if (reminder.lastSentAt) {
        const lastSentDay = new Date(reminder.lastSentAt);
        lastSentDay.setHours(0, 0, 0, 0);
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        if (lastSentDay.getTime() === todayStart.getTime()) {
          console.log(`Reminder ${reminder.id} already sent today, skipping.`);
          continue;
        }
      }

      await sendReminderToTenants(reminder);
    }
  } catch (error) {
    console.error('Error processing fixed date reminders:', error);
  }
}

async function checkRelativeReminders(): Promise<void> {
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
      const daysOffset = parseInt(reminder.triggerValue);
      if (isNaN(daysOffset)) continue;

      // BUG #9 FIX: skip if this reminder already fired today
      if (reminder.lastSentAt) {
        const lastSentDay = new Date(reminder.lastSentAt);
        lastSentDay.setHours(0, 0, 0, 0);
        if (lastSentDay.getTime() === today.getTime()) {
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
      }

      // Update lastSentAt on the reminder so subsequent cron ticks skip it
      if (didSendToAnyone) {
        await prisma.scheduledReminder.update({
          where: { id: reminder.id },
          data: { lastSentAt: new Date() },
        });
      }
    }
  } catch (error) {
    console.error('Error checking relative reminders:', error);
  }
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

  // Mark this reminder as sent today (BUG #9 FIX)
  if (tenants.length > 0) {
    await prisma.scheduledReminder.update({
      where: { id: reminder.id },
      data: { lastSentAt: new Date() },
    });
  }
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