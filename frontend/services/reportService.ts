import { api } from './api';
import { HealthReport } from '@/types/report';

export const reportService = {
  async getLatest(): Promise<HealthReport> {
    const { data } = await api.get<HealthReport>('/api/reports/latest/');
    return data;
  },

  async getById(id: number): Promise<HealthReport> {
    const { data } = await api.get<HealthReport>(`/api/reports/${id}/`);
    return data;
  },

  async retryTriage(id: number): Promise<HealthReport> {
    const { data } = await api.post<HealthReport>(`/api/reports/${id}/retry/`);
    return data;
  },
};
