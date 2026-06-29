import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWRImmutable from 'swr/immutable';
import { type ReportWithDefinition } from '../types';

/**
 * useReportDefinition
 * Fetches a single KenyaEMR report together with its definition and parameters.
 */
export const useReportDefinition = (reportUuid: string) => {
  const url = reportUuid ? `${restBaseUrl}/kenyaemr/reports/${reportUuid}` : null;

  const { data, isLoading, error, mutate } = useSWRImmutable<{ data: ReportWithDefinition }>(url, openmrsFetch);

  return {
    report: data?.data ?? null,
    parameters: data?.data?.definition?.parameters ?? [],
    isLoading,
    error,
    mutate,
  };
};

/**
 * requestReport
 * Queues a report request with the supplied parameter values.
 */
export const requestReport = (reportUuid: string, parameterValues: Record<string, unknown>) => {
  return openmrsFetch(`${restBaseUrl}/kenyaemr/reports/${reportUuid}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: parameterValues,
  });
};
