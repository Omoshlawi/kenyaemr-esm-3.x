import { FetchResponse, openmrsFetch, restBaseUrl, useSession } from '@openmrs/esm-framework';
import useSWR from 'swr';

type FacilityRegistryStatus = {
  sha_operational_status?: string;
  regulatory_operational_status?: string;
};

export const useFacilityRegistry = () => {
  const { authenticated } = useSession();
  const url = `${restBaseUrl}/virtualclaims/facility-registry`;
  const { data, isLoading, error, mutate } = useSWR<FetchResponse<FacilityRegistryStatus>>(
    authenticated ? url : null,
    openmrsFetch,
    { revalidateOnFocus: false },
  );

  const notYetSynced = (error as any)?.response?.status === 404;

  return {
    isLoading,
    facility: data?.data,
    error: notYetSynced ? null : error,
    notYetSynced,
    mutate,
  };
};
