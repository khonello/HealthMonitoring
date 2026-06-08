import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

function getBaseUrl(): string {
  if (!__DEV__) return 'https://api.healthmonitoring.app';
  // In Expo Go, hostUri is "192.168.x.x:8081" — strip the Metro port and use Django's
  const host = Constants.expoConfig?.hostUri?.split(':').shift();
  if (host) return `http://${host}:8000`;
  return 'http://localhost:8000';
}

const BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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
      }
    }
    return Promise.reject(error);
  }
);
