import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { SHRSummary } from '../types/index';

/**
 * Loads the patient's SHR history from
 * `/kenyaemril/hie-patient-history?patientUuid={uuid}&practitionerUuid={uuid}`.
 */
export const useSHRSummary = (patientUuid: string, practitionerUuid?: string | null) => {
  const url =
    patientUuid && practitionerUuid
      ? `${restBaseUrl}/kenyaemril/hie-patient-history?patientUuid=${encodeURIComponent(
          patientUuid,
        )}&practitionerUuid=${encodeURIComponent(practitionerUuid)}`
      : null;
  const { data, mutate, error, isLoading, isValidating } = useSWR<{ data: SHRSummary }>(url, openmrsFetch);

  return {
    data: data?.data ?? null,
    isError: error,
    isLoading,
    isValidating,
    mutate,
  };
};

export const useCommunityReferrals = (status: string) => {
  const shrSummaryUrl = `${restBaseUrl}/kenyaemril/communityReferrals?status=${status}`;
  const { data, mutate, error, isLoading } = useSWR<{ data: SHRSummary }>(shrSummaryUrl, openmrsFetch);

  return {
    data: data?.data ? data?.data : null,
    isError: error,
    isLoading: isLoading,
  };
};
