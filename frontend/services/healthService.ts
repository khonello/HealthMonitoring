import { api } from './api';
import { HealthRecord, HealthSubmitPayload } from '@/types/health';
import { SubmitResponse } from '@/types/report';

interface PaginatedRecords {
  count: number;
  next: string | null;
  previous: string | null;
  results: HealthRecord[];
}

export const healthService = {
  async submit(payload: HealthSubmitPayload): Promise<SubmitResponse> {
    const clean = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );
    const { data } = await api.post<SubmitResponse>('/api/health/submit/', clean);
    return data;
  },

  async getHistory(url?: string): Promise<PaginatedRecords> {
    const endpoint = url ?? '/api/health/history/';
    const { data } = await api.get<PaginatedRecords | HealthRecord[]>(endpoint);
    if (Array.isArray(data)) {
      return { count: data.length, next: null, previous: null, results: data };
    }
    return data;
  },

  async exportData(): Promise<HealthRecord[]> {
    const { data } = await api.get<HealthRecord[]>('/api/health/export/');
    return data;
  },

  async deleteRecord(id: number): Promise<void> {
    await api.delete(`/api/health/${id}/`);
  },

  async getTip(): Promise<{ text: string; category: string; icon: string }> {
    const { data } = await api.get('/api/health/tip/');
    return data;
  },
};
