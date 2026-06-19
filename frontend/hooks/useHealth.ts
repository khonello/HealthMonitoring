import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useHealthStore } from '@/store/healthStore';
import { healthService } from '@/services/healthService';
import { HealthSubmitPayload } from '@/types/health';

export function useHealth() {
  const router = useRouter();
  const {
    nextPageUrl,
    setRecords,
    appendRecords,
    removeRecord,
    setLastSubmit,
    setLoading,
    setLoadingMore,
    setError,
  } = useHealthStore();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await healthService.getHistory();
      setRecords(page.results, page.count, page.next);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, [setRecords, setLoading, setError]);

  const fetchMoreHistory = useCallback(async () => {
    if (!nextPageUrl) return;
    setLoadingMore(true);
    try {
      const page = await healthService.getHistory(nextPageUrl);
      appendRecords(page.results, page.count, page.next);
    } catch {
      // silently ignore — list still shows cached records
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageUrl, appendRecords, setLoadingMore]);

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

  const deleteRecord = useCallback(
    async (id: number) => {
      removeRecord(id);
      try {
        await healthService.deleteRecord(id);
      } catch {
        // if the API call fails, re-fetch to restore accurate state
        fetchHistory();
      }
    },
    [removeRecord, fetchHistory]
  );

  return { fetchHistory, fetchMoreHistory, submit, deleteRecord };
}
