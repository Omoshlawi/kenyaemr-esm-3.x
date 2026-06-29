import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWRImmutable from 'swr/immutable';
import { type ReportCategory, type ReportDescriptor, type ReportsResponse } from '../types';

const byName = (a: ReportDescriptor, b: ReportDescriptor) => a.name.localeCompare(b.name);

/**
 * useGroupedReports
 * Fetches grouped KenyaEMR reports with each category's reports sorted alphabetically.
 */
const useGroupedReports = () => {
  const url = `${restBaseUrl}/kenyaemr/reports/grouped`;

  const { data, isLoading, error, mutate } = useSWRImmutable<{ data: ReportsResponse }>(url, openmrsFetch);

  const reports: Array<ReportCategory> = (data?.data.results ?? []).map((group) => ({
    ...group,
    indicator: [...(group.indicator ?? [])].sort(byName),
    patientFollowUpReports: [...(group.patientFollowUpReports ?? [])].sort(byName),
  }));

  return {
    reports,
    isLoading,
    error,
    mutate,
  };
};

export default useGroupedReports;
