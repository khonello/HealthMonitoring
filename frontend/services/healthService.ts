import { api } from './api';
import { HealthRecord, HealthSubmitPayload } from '@/types/health';
import { SubmitResponse } from '@/types/report';

export const healthService = {
  async submit(payload: HealthSubmitPayload): Promise<SubmitResponse> {
    const clean = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );
    const { data } = await api.post<SubmitResponse>('/api/health/submit/', clean);
    return data;
  },

  async getHistory(): Promise<HealthRecord[]> {
    const { data } = await api.get<HealthRecord[]>('/api/health/history/');
    return data;
  },
};
