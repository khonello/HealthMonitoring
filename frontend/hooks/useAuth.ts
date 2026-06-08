import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useHealthStore } from '@/store/healthStore';
import { useReportStore } from '@/store/reportStore';
import { authService } from '@/services/authService';
import { LoginPayload, RegisterPayload } from '@/types/auth';

export function useAuth() {
  const router = useRouter();
  const { setUser, clear: clearAuth } = useAuthStore();
  const { clear: clearHealth } = useHealthStore();
  const { clear: clearReports } = useReportStore();

  const login = useCallback(
    async (payload: LoginPayload) => {
      const data = await authService.login(payload);
      setUser(data.user);
      router.replace('/(tabs)');
    },
    [setUser, router]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const data = await authService.register(payload);
      setUser(data.user);
      router.replace('/(tabs)');
    },
    [setUser, router]
  );

  const logout = useCallback(async () => {
    await authService.logout();
    clearAuth();
    clearHealth();
    clearReports();
    router.replace('/(auth)/login');
  }, [clearAuth, clearHealth, clearReports, router]);

  const refreshProfile = useCallback(async () => {
    const user = await authService.getProfile();
    setUser(user);
    return user;
  }, [setUser]);

  return { login, register, logout, refreshProfile };
}
