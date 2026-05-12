import useSWR from 'swr';
import { openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';
import { FacilityRegistryRecord, FacilityRegistrySyncResult } from './type';
import { facilityRegistryUrl } from './constant';

export const useFacilityRegistry = () => {
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<FacilityRegistryRecord>>(
    facilityRegistryUrl,
    openmrsFetch,
    {
      revalidateOnFocus: false,
    },
  );

  const notYetSynced = error?.response?.status === 404;

  return {
    facility: data?.data,
    isLoading,
    error: notYetSynced ? null : error,
    notYetSynced,
    mutate,
  };
};

export const syncFacilityRegistry = async (): Promise<FacilityRegistrySyncResult> => {
  const response = await openmrsFetch<FacilityRegistrySyncResult>(facilityRegistryUrl + '/sync', { method: 'POST' });
  return response.data;
};
