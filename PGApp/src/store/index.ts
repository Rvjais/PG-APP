import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import type { User, Building, Tenant, CustomField, MessageTemplate, ScheduledReminder, MessageLimit } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (name: string, whatsappNumber?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        set({ user: data.user, token: data.token });
      },
      logout: () => set({ user: null, token: null }),
      updateProfile: async (name, whatsappNumber) => {
        const { data } = await api.put('/settings/profile', { name, whatsappNumber });
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, name: data.name, whatsappNumber: data.whatsappNumber } });
        }
      },
    }),
    { name: 'auth-storage' }
  )
);

interface BuildingState {
  buildings: Building[];
  loading: boolean;
  fetchBuildings: () => Promise<void>;
  createBuilding: (name: string, address?: string) => Promise<void>;
  updateBuilding: (id: string, name: string, address?: string) => Promise<void>;
  deleteBuilding: (id: string) => Promise<void>;
}

export const useBuildingStore = create<BuildingState>((set, get) => ({
  buildings: [],
  loading: false,
  fetchBuildings: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/buildings');
      set({ buildings: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  createBuilding: async (name, address) => {
    try {
      await api.post('/buildings', { name, address });
      await get().fetchBuildings();
    } catch (error) {
      console.error('Failed to create building:', error);
      throw error;
    }
  },
  updateBuilding: async (id, name, address) => {
    try {
      await api.put(`/buildings/${id}`, { name, address });
      await get().fetchBuildings();
    } catch (error) {
      console.error('Failed to update building:', error);
      throw error;
    }
  },
  deleteBuilding: async (id) => {
    try {
      await api.delete(`/buildings/${id}`);
      await get().fetchBuildings();
    } catch (error) {
      console.error('Failed to delete building:', error);
      throw error;
    }
  },
}));

interface TenantState {
  tenants: Tenant[];
  loading: boolean;
  activeBuildingId: string | undefined;
  fetchTenants: (buildingId?: string) => Promise<void>;
  createTenant: (data: Partial<Tenant>) => Promise<void>;
  updateTenant: (id: string, data: Partial<Tenant>) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenants: [],
  loading: false,
  activeBuildingId: undefined,
  fetchTenants: async (buildingId) => {
    set({ loading: true, activeBuildingId: buildingId });
    try {
      const params = buildingId ? { buildingId } : {};
      const { data } = await api.get('/tenants', { params });
      set({ tenants: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  createTenant: async (tenantData) => {
    try {
      await api.post('/tenants', tenantData);
      await get().fetchTenants(get().activeBuildingId);
    } catch (error) {
      console.error('Failed to create tenant:', error);
      throw error;
    }
  },
  updateTenant: async (id, tenantData) => {
    try {
      await api.put(`/tenants/${id}`, tenantData);
      await get().fetchTenants(get().activeBuildingId);
    } catch (error) {
      console.error('Failed to update tenant:', error);
      throw error;
    }
  },
  deleteTenant: async (id) => {
    try {
      await api.delete(`/tenants/${id}`);
      await get().fetchTenants(get().activeBuildingId);
    } catch (error) {
      console.error('Failed to delete tenant:', error);
      throw error;
    }
  },
}));

interface CustomFieldState {
  fields: CustomField[];
  fetchFields: () => Promise<void>;
  createField: (data: Partial<CustomField>) => Promise<void>;
  updateField: (id: string, data: Partial<CustomField>) => Promise<void>;
  deleteField: (id: string) => Promise<void>;
}

export const useCustomFieldStore = create<CustomFieldState>((set, get) => ({
  fields: [],
  fetchFields: async () => {
    try {
      const { data } = await api.get('/custom-fields');
      set({ fields: data });
    } catch (error) {
      console.error('Failed to fetch custom fields:', error);
    }
  },
  createField: async (fieldData) => {
    try {
      await api.post('/custom-fields', fieldData);
      await get().fetchFields();
    } catch (error) {
      console.error('Failed to create custom field:', error);
      throw error;
    }
  },
  updateField: async (id, fieldData) => {
    try {
      await api.put(`/custom-fields/${id}`, fieldData);
      await get().fetchFields();
    } catch (error) {
      console.error('Failed to update custom field:', error);
      throw error;
    }
  },
  deleteField: async (id) => {
    try {
      await api.delete(`/custom-fields/${id}`);
      await get().fetchFields();
    } catch (error) {
      console.error('Failed to delete custom field:', error);
      throw error;
    }
  },
}));

interface TemplateState {
  templates: MessageTemplate[];
  fetchTemplates: () => Promise<void>;
  createTemplate: (name: string, templateText: string) => Promise<void>;
  updateTemplate: (id: string, name: string, templateText: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  previewTemplate: (templateId: string, tenantId: string) => Promise<string>;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  fetchTemplates: async () => {
    try {
      const { data } = await api.get('/templates');
      set({ templates: data });
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  },
  createTemplate: async (name, templateText) => {
    try {
      await api.post('/templates', { name, templateText });
      await get().fetchTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
      throw error;
    }
  },
  updateTemplate: async (id, name, templateText) => {
    try {
      await api.put(`/templates/${id}`, { name, templateText });
      await get().fetchTemplates();
    } catch (error) {
      console.error('Failed to update template:', error);
      throw error;
    }
  },
  deleteTemplate: async (id) => {
    try {
      await api.delete(`/templates/${id}`);
      await get().fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  },
  previewTemplate: async (templateId, tenantId) => {
    const { data } = await api.post(`/templates/${templateId}/preview`, { tenantId });
    return data.preview;
  },
}));

interface ReminderState {
  reminders: ScheduledReminder[];
  fetchReminders: () => Promise<void>;
  createReminder: (data: Partial<ScheduledReminder>) => Promise<void>;
  updateReminder: (id: string, data: Partial<ScheduledReminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  fetchReminders: async () => {
    try {
      const { data } = await api.get('/scheduler/reminders');
      set({ reminders: data });
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    }
  },
  createReminder: async (reminderData) => {
    try {
      await api.post('/scheduler/reminders', reminderData);
      await get().fetchReminders();
    } catch (error) {
      console.error('Failed to create reminder:', error);
      throw error;
    }
  },
  updateReminder: async (id, reminderData) => {
    try {
      await api.put(`/scheduler/reminders/${id}`, reminderData);
      await get().fetchReminders();
    } catch (error) {
      console.error('Failed to update reminder:', error);
      throw error;
    }
  },
  deleteReminder: async (id) => {
    try {
      await api.delete(`/scheduler/reminders/${id}`);
      await get().fetchReminders();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      throw error;
    }
  },
}));

interface SettingsState {
  messageLimit: MessageLimit | null;
  fetchMessageLimit: () => Promise<void>;
  updateMessageLimit: (data: Partial<MessageLimit>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  messageLimit: null,
  fetchMessageLimit: async () => {
    try {
      const { data } = await api.get('/settings/message-limits');
      set({ messageLimit: data });
    } catch (error) {
      console.error('Failed to fetch message limits:', error);
    }
  },
  updateMessageLimit: async (limitData) => {
    try {
      const { data } = await api.put('/settings/message-limits', limitData);
      set({ messageLimit: data });
    } catch (error) {
      console.error('Failed to update message limits:', error);
      throw error;
    }
  },
}));