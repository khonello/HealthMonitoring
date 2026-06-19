import axios from 'axios';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';

function getBaseUrl(): string {
  if (!__DEV__) return 'https://api.healthmonitoring.app';
  const host = Constants.expoConfig?.hostUri?.split(':').shift();
  if (host) return `http://${host}:8000`;
  return 'http://localhost:8000';
}

export const BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await SecureStore.getItemAsync('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, { refresh });
        await SecureStore.setItemAsync('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        useAuthStore.getState().clear();
      }
    }
    return Promise.reject(error);
  }
);

// Proactively refresh the access token when the app returns to foreground,
// eliminating the latency spike caused by a reactive 401 + retry cycle.
AppState.addEventListener('change', async (nextState) => {
  if (nextState !== 'active') return;
  try {
    const refresh = await SecureStore.getItemAsync('refresh_token');
    if (!refresh) return;
    const { data } = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, { refresh });
    await SecureStore.setItemAsync('access_token', data.access);
  } catch {
    // silently ignore — 401 interceptor handles the fallback
  }
});
