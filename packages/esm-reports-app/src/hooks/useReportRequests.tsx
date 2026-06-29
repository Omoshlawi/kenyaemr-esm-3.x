import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { type ReportRequest } from '../types';

/**
 * useReportRequests
 * Fetches the execution history (report requests) for a given report.
 * Polls while there are in-flight requests so running rows update automatically.
 */
export const useReportRequests = (reportUuid: string) => {
  const url = reportUuid ? `${restBaseUrl}/kenyaemr/reportRequests?reportUuid=${reportUuid}` : null;

  const { data, isLoading, isValidating, error, mutate } = useSWR<{ data: { results: Array<ReportRequest> } }>(
    url,
    openmrsFetch,
    { refreshInterval: 10000 },
  );

  return {
    requests: data?.data?.results ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
};
