import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useHealthStore } from '@/store/healthStore';
import { healthService } from '@/services/healthService';
import { HealthSubmitPayload } from '@/types/health';

export function useHealth() {
  const router = useRouter();
  const { setRecords, setLastSubmit, setLoading, setError } = useHealthStore();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await healthService.getHistory();
      setRecords(records);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, [setRecords, setLoading, setError]);

  const submit = useCallback(
    async (payload: HealthSubmitPayload) => {
      setLoading(true);
      setError(null);
      try {
        const result = await healthService.submit(payload);
        setLastSubmit(result);
        router.push({ pathname: '/report/[id]', params: { id: String(result.report_id) } });
        return result;
      } catch (e: any) {
        const msg =
          e?.response?.data?.non_field_errors?.[0] ??
          e?.response?.data?.detail ??
          'Submission failed. Please try again.';
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [setLastSubmit, setLoading, setError, router]
  );

  return { fetchHistory, submit };
}
