import { FetchResponse, openmrsFetch, restBaseUrl, useSession } from '@openmrs/esm-framework';
import useSWR from 'swr';

export type EnumEntry = {
  code: string;
  label: string;
};

type RegulatorsResponse = {
  count: number;
  regulators: Array<EnumEntry>;
};

type IdentificationTypesResponse = {
  count: number;
  identification_types: Array<EnumEntry>;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const useProfessionalRegistryRegulators = () => {
  const { authenticated } = useSession();
  const url = `${restBaseUrl}/virtualclaims/professional-registry/regulators`;

  const { data, error, isLoading } = useSWR<FetchResponse<RegulatorsResponse>>(
    authenticated ? url : null,
    openmrsFetch,
    {
      revalidateOnFocus: false,
      dedupingInterval: ONE_DAY_MS,
    },
  );

  return {
    regulators: data?.data?.regulators ?? [],
    isLoading,
    error,
  };
};

export const useProfessionalRegistryIdentificationTypes = () => {
  const { authenticated } = useSession();
  const url = `${restBaseUrl}/virtualclaims/professional-registry/identification-types`;

  const { data, error, isLoading } = useSWR<FetchResponse<IdentificationTypesResponse>>(
    authenticated ? url : null,
    openmrsFetch,
    {
      revalidateOnFocus: false,
      dedupingInterval: ONE_DAY_MS,
    },
  );

  return {
    identificationTypes: data?.data?.identification_types ?? [],
    isLoading,
    error,
  };
};
