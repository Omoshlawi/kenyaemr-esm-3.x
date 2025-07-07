import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl, usePagination } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { type StockOperationFilter } from './types';
import { useStockTagLocations } from '../../user-management.resources';

export function useStockLocationPages(filter: StockOperationFilter) {
  const { stockLocations, error, isLoading } = useStockTagLocations();

  const pageSizes = [10, 20, 30, 40, 50];
  const [currentPageSize, setPageSize] = useState(10);

  const { goTo, results: paginatedQueueEntries, currentPage } = usePagination(stockLocations, currentPageSize);

  const { t } = useTranslation();

  const tableHeaders = useMemo(
    () => [
      {
        id: 0,
        header: t('name', 'Name'),
        key: 'name',
      },
      {
        id: 1,
        header: t('tags', 'Tags'),
        key: 'tags',
      },
      {
        id: 2,
        header: t('childLocations', 'Child Locations'),
        key: 'childLocations',
      },
      {
        id: 3,
        header: t('actions', 'Actions'),
        key: 'actions',
      },
    ],
    [t],
  );

  const tableRows = useMemo(() => {
    return stockLocations.map((location: any) => ({
      id: location?.uuid,
      key: `key-${location?.uuid}`,
      uuid: `${location?.uuid}`,
      name: `${location?.name}`,
      tags:
        location?.meta.tag
          ?.filter((tag) => tag.code !== 'SUBSETTED')
          .map((p) => p.code)
          ?.join(', ') ?? '',
      childLocations: location?.childLocations?.map((p) => p.display)?.join(', ') ?? '',
    }));
  }, [stockLocations]);
  return {
    items: stockLocations,
    currentPage,
    currentPageSize,
    paginatedQueueEntries,
    goTo,
    pageSizes,
    isLoading,
    error,
    setPageSize,
    tableHeaders,
    tableRows,
  };
}

export const useLocationTags = () => {
  const url = `${restBaseUrl}/locationtag/`;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { data, isLoading, mutate } = useSWR<
    FetchResponse<{ results: Array<{ uuid: string; display: string }> }>,
    Error
  >(url, openmrsFetch);
  const results = data?.data?.results ? data?.data?.results : [];
  return {
    locationTagList: results,
    loading: isLoading,
    mutate,
  };
};
interface LocationName {
  name: string;
}
export async function saveLocation({ locationPayload }): Promise<FetchResponse<LocationName>> {
  const response: FetchResponse = await openmrsFetch(`${restBaseUrl}/location/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: locationPayload,
  });
  return response;
}
