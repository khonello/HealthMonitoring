import { api } from './api';

export interface DisclaimerResponse {
  disclaimer: string;
}

export const configService = {
  async getDisclaimer(): Promise<string> {
    const { data } = await api.get<DisclaimerResponse>('/api/config/disclaimer/');
    return data.disclaimer;
  },
};
