import { create } from 'zustand';
import { HealthReport } from '@/types/report';

interface ReportState {
  reports: Record<number, HealthReport>;
  isLoading: boolean;
  error: string | null;
  setReport: (report: HealthReport) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useReportStore = create<ReportState>()((set) => ({
  reports: {},
  isLoading: false,
  error: null,
  setReport: (report) =>
    set((state) => ({ reports: { ...state.reports, [report.id]: report } })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clear: () => set({ reports: {} }),
}));
