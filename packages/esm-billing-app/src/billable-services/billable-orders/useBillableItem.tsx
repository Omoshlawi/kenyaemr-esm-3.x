import useSWRImmutable from 'swr/immutable';
import { openmrsFetch, restBaseUrl, useOpenmrsFetchAll } from '@openmrs/esm-framework';
import useSWR from 'swr';
import first from 'lodash-es/first';
import { type Drug } from '@openmrs/esm-patient-common-lib';
import { useMemo } from 'react';

type BillableItemResponse = {
  uuid: string;
  name: string;
  concept: {
    uuid: string;
    display: string;
  };
  servicePrices: Array<{
    uuid: string;
    price: number;
    paymentMode: {
      uuid: string;
      name: string;
    };
  }>;
};

export const useBillableItem = (billableItemId: string, drugUuid?: string) => {
  const customRepresentation = `v=custom:(uuid,name,concept:(uuid,display),servicePrices:(uuid,price,paymentMode:(uuid,name)))`;
  const url = drugUuid
    ? `${restBaseUrl}/cashier/billableService?${customRepresentation}&drugUuid=${drugUuid}`
    : `${restBaseUrl}/cashier/billableService?${customRepresentation}`;
  const { data, error, isLoading } = useSWRImmutable<{ data: { results: Array<BillableItemResponse> } }>(
    url,
    openmrsFetch,
  );
  const billableItem = drugUuid
    ? first(data?.data?.results)
    : data?.data?.results?.find((item) => item?.concept?.uuid === billableItemId);

  return {
    billableItem: billableItem,
    isLoading: isLoading,
    error,
  };
};

export const useSockItemInventory = (stockItemId: string) => {
  const url = `/ws/rest/v1/stockmanagement/stockiteminventory?v=default&limit=10&totalCount=true&drugUuid=${stockItemId}`;
  const { data, error, isLoading } = useSWR<{
    data: { results: Array<{ quantityUoM: string; quantity: number; partyName: string }> };
  }>(url, openmrsFetch);
  return {
    stockItem: (data?.data?.results as Array<any>) ?? [],
    isLoading: isLoading,
    error,
  };
};

export const useStockItemQuantity = (drugUuid: string) => {
  const url = `/ws/rest/v1/stockmanagement/stockiteminventory?v=default&limit=10&totalCount=true&drugUuid=${drugUuid}`;
  const { data, error, isLoading } = useSWR<{
    data: {
      results: Array<{ quantityUoM: string; quantity: number; partyName: string; stockItemUuid: string }>;
      total: number;
    };
  }>(url, openmrsFetch);
  return {
    stockItemQuantity: data?.data?.total ?? 0,
    stockItemUuid: data?.data?.results[0]?.stockItemUuid ?? '',
    isLoading: isLoading,
    error,
  };
};

export const useDrugQuantityByConceptUuid = (conceptUuid: string) => {
  const url = `${restBaseUrl}/stockmanagement/stockitem?conceptUuid=${conceptUuid}&v=default`;
  const {
    data: results,
    isLoading,
    error,
  } = useOpenmrsFetchAll<{ conceptName: string; conceptUuid: string; drugUuid: string; drugName: string }>(url);
  const drugUuids = results?.map((r) => r.drugUuid).filter(Boolean) ?? [];
  const inventoryKey = `${restBaseUrl}/stockmanagement/stockiteminventory?v=default&totalCount=true&drugUuids=${drugUuids.join(
    ',',
  )}`;
  const {
    data,
    error: inventoryError,
    isLoading: isLoadingInventory,
  } = useSWR(inventoryKey, async (_: string) => {
    const itemsInventory = drugUuids.map(async (uuid) => {
      const inv = `${restBaseUrl}/stockmanagement/stockiteminventory?v=default&totalCount=true&drugUuid=${uuid}`;
      const res = await openmrsFetch<{
        results: Array<{ quantityUoM: string; quantity: number; partyName: string }>;
      }>(inv);
      const items = res.data?.results ?? [];
      return {
        items,
        totalQuantity: items.reduce((acc, item) => acc + item.quantity, 0),
        quantityUoM: items[0]?.quantityUoM ?? '',
      };
    });
    const res = await Promise.all(itemsInventory);
    const totalQuantity = res.reduce((acc, { totalQuantity }) => acc + totalQuantity, 0);
    return { totalQuantity, quantityUoM: res.find((r) => r.quantityUoM)?.quantityUoM ?? '' };
  });

  return {
    isLoading: isLoading || isLoadingInventory,
    error: error ?? inventoryError,
    quantity: data?.totalQuantity ?? 0,
    quantityUoM: data?.quantityUoM,
  };
};
