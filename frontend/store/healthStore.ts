import { create } from 'zustand';
import { HealthRecord } from '@/types/health';
import { SubmitResponse } from '@/types/report';

interface HealthState {
  records: HealthRecord[];
  totalCount: number;
  nextPageUrl: string | null;
  lastSubmit: SubmitResponse | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  setRecords: (records: HealthRecord[], totalCount: number, nextPageUrl: string | null) => void;
  appendRecords: (records: HealthRecord[], totalCount: number, nextPageUrl: string | null) => void;
  removeRecord: (id: number) => void;
  setLastSubmit: (result: SubmitResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useHealthStore = create<HealthState>()((set) => ({
  records: [],
  totalCount: 0,
  nextPageUrl: null,
  lastSubmit: null,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  setRecords: (records, totalCount, nextPageUrl) => set({ records, totalCount, nextPageUrl }),
  appendRecords: (records, totalCount, nextPageUrl) =>
    set((state) => ({
      records: [...state.records, ...records],
      totalCount,
      nextPageUrl,
    })),
  removeRecord: (id) =>
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
      totalCount: Math.max(0, state.totalCount - 1),
    })),
  setLastSubmit: (lastSubmit) => set({ lastSubmit }),
  setLoading: (isLoading) => set({ isLoading }),
  setLoadingMore: (isLoadingMore) => set({ isLoadingMore }),
  setError: (error) => set({ error }),
  clear: () => set({ records: [], totalCount: 0, nextPageUrl: null, lastSubmit: null, error: null }),
}));
