import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { type ReportData } from '../types';

/**
 * useReportData
 * Loads the rendered data (datasets, columns, rows) for a completed report request.
 */
export const useReportData = (requestId?: string | number) => {
  const url = requestId ? `${restBaseUrl}/kenyaemr/reportRequests/${requestId}/data` : null;

  const { data, isLoading, error, mutate } = useSWR<{ data: ReportData }>(url, openmrsFetch);

  return {
    reportData: data?.data ?? null,
    isLoading,
    error,
    mutate,
  };
};
