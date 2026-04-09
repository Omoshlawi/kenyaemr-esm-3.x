import { type FetchResponse, openmrsFetch, useConfig } from '@openmrs/esm-framework';
import useSWRImmutable from 'swr/immutable';
import { ExpressWorkflowConfig } from '../../../../config-schema';

export const useDefaultFacilityLocation = () => {
  const config = useConfig() as ExpressWorkflowConfig;
  const apiUrl = config.defaultFacilityUrl;
  const { data, error, isLoading } = useSWRImmutable<FetchResponse>(apiUrl, openmrsFetch);

  return {
    defaultFacility: data ? data?.data : null,
    isLoading: isLoading,
    error: error,
  };
};
