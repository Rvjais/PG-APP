export interface User {
  id: string;
  email: string;
  name: string;
  whatsappNumber?: string;
  isAdmin?: boolean;
}

export interface Building {
  id: string;
  ownerId: string;
  name: string;
  address?: string;
  createdAt: string;
  _count?: { tenants: number };
  tenants?: Tenant[];
}

export interface CustomField {
  id: string;
  ownerId: string;
  fieldName: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT';
  fieldOptions?: string[];
  isRequired: boolean;
}

export interface Tenant {
  id: string;
  buildingId: string;
  ownerId: string;
  name: string;
  phone: string;
  roomNumber: string;
  floor: number;
  rentAmount?: number;
  joinDate?: string;
  isActive: boolean;
  customFieldValues: Record<string, any>;
  building?: { id: string; name: string };
}

export interface MessageTemplate {
  id: string;
  ownerId: string;
  name: string;
  templateText: string;
  createdAt: string;
}

export interface ScheduledReminder {
  id: string;
  ownerId: string;
  buildingId?: string;
  templateId: string;
  triggerType: 'FIXED_DATE' | 'RELATIVE_TO_JOIN';
  triggerValue: string;
  sendFrom?: string;
  sendUntil?: string;
  isActive: boolean;
  template?: MessageTemplate;
  building?: { id: string; name: string };
}

export interface MessageLog {
  id: string;
  ownerId: string;
  tenantId: string;
  messageContent: string;
  imageData?: string;
  sentAt: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  tenant?: { id: string; name: string; phone: string; roomNumber: string };
}

export interface MessageLimit {
  id: string;
  ownerId: string;
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
}

export interface WhatsAppStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  qrCode?: string;
}