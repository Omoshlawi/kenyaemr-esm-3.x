import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { PatientPreauthorsResponse } from './type';

export const usePatientPreauths = (patientUuid: string | null) => {
  const url = patientUuid ? `${restBaseUrl}/virtualclaims/patient-preauths?patientUuid=${patientUuid}&limit=20` : null;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<PatientPreauthorsResponse>>(url, openmrsFetch);
  return {
    preauths: data?.data?.results ?? [],
    total: data?.data?.total ?? 0,
    error,
    isLoading,
    mutate,
  };
};
