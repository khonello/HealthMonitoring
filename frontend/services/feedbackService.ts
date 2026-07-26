import { api } from './api';
import { PaginatedResponse } from '@/types/admin';
import {
  AdminFeedback,
  AdminFeedbackFilters,
  Feedback,
  FeedbackStatus,
  FeedbackSubmitPayload,
} from '@/types/feedback';

export const feedbackService = {
  async submit(payload: FeedbackSubmitPayload): Promise<Feedback> {
    const { data } = await api.post<Feedback>('/api/feedback/', payload);
    return data;
  },

  async getMine(): Promise<PaginatedResponse<Feedback>> {
    const { data } = await api.get<PaginatedResponse<Feedback>>('/api/feedback/');
    return data;
  },

  async getAll(filters?: AdminFeedbackFilters): Promise<PaginatedResponse<AdminFeedback>> {
    const { data } = await api.get<PaginatedResponse<AdminFeedback>>('/api/admin/feedback/', {
      params: filters,
    });
    return data;
  },

  async update(
    id: number,
    patch: { status?: FeedbackStatus; admin_note?: string }
  ): Promise<AdminFeedback> {
    const { data } = await api.patch<AdminFeedback>(`/api/admin/feedback/${id}/`, patch);
    return data;
  },
};
