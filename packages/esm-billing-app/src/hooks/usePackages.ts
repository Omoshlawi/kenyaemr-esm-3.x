import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { Package } from '../types';

/**
 * Hook that return a list of sha benefits category/packages
 * @returns
 */
const usePackages = () => {
  const url = `${restBaseUrl}/kenyaemr/sha-benefits-package?synchronize=false`;

  // const { data, isLoading, error } = useSWR<FetchResponse<{ shaBenefitsPackage: string }>>(url, openmrsFetch);
  const { data, isLoading, error } = useSWR<{ data: Array<{ code: string; name: string; description: string }> }>(
    url,
    async (url) => {
      const response = await new Promise<Array<{ code: string; name: string; description: string }>>((resolve) =>
        setTimeout(() => resolve(require('./packages.json')), 3000),
      );
      return { data: response };
    },
  );

  return {
    isLoading,
    packages: (data?.data ?? []).map(
      (category) =>
        ({
          uuid: `${category.code}`,
          packageCode: category.code,
          packageName: category.name,
        } as Package),
    ),
    error,
  };
};

export default usePackages;
