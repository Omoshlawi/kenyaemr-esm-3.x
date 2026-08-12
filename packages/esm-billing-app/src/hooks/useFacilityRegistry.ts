import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';

const facilityRegistryUrl = `${restBaseUrl}/virtualclaims/facility-registry`;

export interface FacilityRegistryRecord {
  fr_code: string;
  official_name?: string;
  keph_level?: string;
  [key: string]: unknown;
}

export const useFacilityRegistry = () => {
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<FacilityRegistryRecord>>(
    facilityRegistryUrl,
    openmrsFetch,
    {
      revalidateOnFocus: false,
    },
  );

  const notYetSynced = error?.response?.status === 404;
  const facility = data?.data;
  const facilityLevel = (facility?.keph_level ?? '').replace(/[^0-9]/g, '');

  return {
    facility,
    facilityLevel,
    isLoading,
    error: notYetSynced ? null : error,
    notYetSynced,
    mutate,
  };
};
