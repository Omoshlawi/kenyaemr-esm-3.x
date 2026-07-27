import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { BillingService } from '../types';

const customPresentation = `custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price,paymentMode))`;
const baseUrl = `${restBaseUrl}/cashier/billableService?v=${customPresentation}`;

export const useBillableServices = () => {
  const { data, error, isLoading } = useSWR<FetchResponse<{ results: Array<BillingService> }>>(baseUrl, openmrsFetch);

  return {
    error,
    isLoading,
    billableServices: data?.data?.results ?? [],
  };
};

export const useBillableServiceByName = (searchTerm: string) => {
  const url = `${baseUrl}&q=${encodeURIComponent(searchTerm)}`;
  const { data, error, isLoading } = useSWR<FetchResponse<{ results: Array<BillingService> }>>(url, openmrsFetch);
  return {
    isLoading,
    error,
    billableServices: data?.data?.results ?? [],
  };
};
