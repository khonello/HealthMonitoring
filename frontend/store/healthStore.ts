import { create } from 'zustand';
import { HealthRecord } from '@/types/health';
import { SubmitResponse } from '@/types/report';

interface HealthState {
  records: HealthRecord[];
  lastSubmit: SubmitResponse | null;
  isLoading: boolean;
  error: string | null;
  setRecords: (records: HealthRecord[]) => void;
  setLastSubmit: (result: SubmitResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useHealthStore = create<HealthState>()((set) => ({
  records: [],
  lastSubmit: null,
  isLoading: false,
  error: null,
  setRecords: (records) => set({ records }),
  setLastSubmit: (lastSubmit) => set({ lastSubmit }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clear: () => set({ records: [], lastSubmit: null, error: null }),
}));
