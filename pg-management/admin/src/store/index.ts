import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (data.user.isAdmin !== true) {
          throw new Error('Admin access required. This account is not an admin.');
        }
        set({ user: data.user, token: data.token });
      },
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'admin-auth' }
  )
);

interface UserState {
  users: User[];
  loading: boolean;
  fetchUsers: () => Promise<void>;
  createUser: (email: string, name?: string, isAdmin?: boolean) => Promise<void>;
  updateUser: (id: string, data: { email?: string; name?: string; isAdmin?: boolean }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  loading: false,
  fetchUsers: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/admin/users');
      set({ users: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  createUser: async (email, name, isAdmin) => {
    await api.post('/admin/users', { email, name, isAdmin });
    await get().fetchUsers();
  },
  updateUser: async (id, userData) => {
    await api.put(`/admin/users/${id}`, userData);
    await get().fetchUsers();
  },
  deleteUser: async (id) => {
    await api.delete(`/admin/users/${id}`);
    await get().fetchUsers();
  },
}));
