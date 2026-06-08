import * as SecureStore from 'expo-secure-store';
import { api } from './api';
import { LoginPayload, RegisterPayload, AuthResponse, User } from '@/types/auth';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/api/auth/login/', payload);
    await SecureStore.setItemAsync('access_token', data.access);
    await SecureStore.setItemAsync('refresh_token', data.refresh);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const clean = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );
    const { data } = await api.post<AuthResponse>('/api/auth/register/', clean);
    await SecureStore.setItemAsync('access_token', data.access);
    await SecureStore.setItemAsync('refresh_token', data.refresh);
    return data;
  },

  async getProfile(): Promise<User> {
    const { data } = await api.get<User>('/api/auth/profile/');
    return data;
  },

  async updateProfile(
    payload: Partial<{ full_name: string; date_of_birth: string | null; gender: string }>
  ): Promise<User> {
    const { data } = await api.patch<User>('/api/auth/profile/', payload);
    return data;
  },

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
  },
};
