import { Tenant } from '@prisma/client';

export function parseTemplate(
  template: string,
  tenant: Tenant & { building?: { name: string } },
  ownerName: string,
  buildingName: string
): string {
  let message = template;

  message = message.replace(/\{\{name\}\}/g, tenant.name);
  message = message.replace(/\{\{phone\}\}/g, tenant.phone);
  message = message.replace(/\{\{room_number\}\}/g, tenant.roomNumber);
  message = message.replace(/\{\{floor\}\}/g, String(tenant.floor));
  message = message.replace(/\{\{rent_amount\}\}/g, tenant.rentAmount ? String(tenant.rentAmount) : 'N/A');
  message = message.replace(/\{\{join_date\}\}/g, tenant.joinDate ? formatDate(tenant.joinDate) : 'N/A');
  message = message.replace(/\{\{building_name\}\}/g, buildingName || 'N/A');
  message = message.replace(/\{\{owner_name\}\}/g, ownerName);

  if (tenant.customFieldValues && typeof tenant.customFieldValues === 'object') {
    const customValues = tenant.customFieldValues as Record<string, any>;
    for (const [key, value] of Object.entries(customValues)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      message = message.replace(
        new RegExp(`\\{\\{custom:${escapedKey}\\}\\}`, 'g'),
        value !== null && value !== undefined ? String(value) : 'N/A'
      );
    }
  }

  return message;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getAvailableVariables(): string[] {
  return [
    '{{name}}',
    '{{phone}}',
    '{{room_number}}',
    '{{floor}}',
    '{{rent_amount}}',
    '{{join_date}}',
    '{{building_name}}',
    '{{owner_name}}',
  ];
}