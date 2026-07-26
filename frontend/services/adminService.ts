import { api } from './api';
import {
  AdminSummary,
  AdminTriageResult,
  AdminUserDetail,
  AdminUserSummary,
  LLMFailureLog,
  LLMStats,
  PaginatedResponse,
  SafetyThreshold,
  SystemConfig,
  TriageOversightFilter,
} from '@/types/admin';

export const adminService = {
  async getSummary(): Promise<AdminSummary> {
    const { data } = await api.get<AdminSummary>('/api/admin/summary/');
    return data;
  },

  async getTriageOversight(filter?: TriageOversightFilter): Promise<PaginatedResponse<AdminTriageResult>> {
    const { data } = await api.get<PaginatedResponse<AdminTriageResult>>('/api/admin/triage/', {
      params: filter ? { filter } : undefined,
    });
    return data;
  },

  async getLLMFailures(): Promise<PaginatedResponse<LLMFailureLog>> {
    const { data } = await api.get<PaginatedResponse<LLMFailureLog>>('/api/admin/llm/failures/');
    return data;
  },

  async getLLMStats(): Promise<LLMStats> {
    const { data } = await api.get<LLMStats>('/api/admin/llm/stats/');
    return data;
  },

  async getUsers(search?: string): Promise<PaginatedResponse<AdminUserSummary>> {
    const { data } = await api.get<PaginatedResponse<AdminUserSummary>>('/api/admin/users/', {
      params: search ? { search } : undefined,
    });
    return data;
  },

  async getUserDetail(id: number): Promise<AdminUserDetail> {
    const { data } = await api.get<AdminUserDetail>(`/api/admin/users/${id}/`);
    return data;
  },

  async deactivateUser(id: number): Promise<AdminUserSummary> {
    const { data } = await api.patch<AdminUserSummary>(`/api/admin/users/${id}/deactivate/`);
    return data;
  },

  async getThresholds(): Promise<PaginatedResponse<SafetyThreshold>> {
    const { data } = await api.get<PaginatedResponse<SafetyThreshold>>('/api/admin/config/thresholds/');
    return data;
  },

  async updateThreshold(id: number, patch: Partial<Pick<SafetyThreshold, 'value' | 'value_high' | 'description'>>): Promise<SafetyThreshold> {
    const { data } = await api.patch<SafetyThreshold>(`/api/admin/config/thresholds/${id}/`, patch);
    return data;
  },

  async getDisclaimer(): Promise<SystemConfig> {
    const { data } = await api.get<SystemConfig>('/api/admin/config/disclaimer/');
    return data;
  },

  async updateDisclaimer(value: string): Promise<SystemConfig> {
    const { data } = await api.patch<SystemConfig>('/api/admin/config/disclaimer/', { value });
    return data;
  },
};
