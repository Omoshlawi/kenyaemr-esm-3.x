import { Concept, FetchResponse, openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { ExpressWorkflowConfig } from '../../config-schema';
import { useMemo } from 'react';
import { useQueues } from '../../hooks/useServiceQueues';
import z from 'zod';
import useSWR from 'swr';

export const useHIVTestServiceQueues = () => {
  const { queues, isLoading: isLoadingQueues, error: errorLoadingQueues } = useQueues();
  const {
    queueServiceConceptUuids: { hivTestingService },
  } = useConfig<ExpressWorkflowConfig>();

  const htsQueues = useMemo(
    () =>
      queues
        .filter((queue) => queue.service.uuid === hivTestingService && queue?.queueRooms?.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [queues, hivTestingService],
  );

  return {
    htsQueues,
    isLoadingQueues,
    errorLoadingQueues,
  };
};

export const hivTestResultSchema = z.object({
  tests: z
    .object({
      result: z.string(),
      stockItem: z.string(),
    })
    .array()
    .nonempty(),
});

export type StockItemInventoryResponse = {
  results: Array<{
    partyUuid: string;
    locationUuid: string;
    partyName: string;
    stockItemUuid: string;
    drugId: number | null;
    drugUuid: string | null;
    drugStrength: string | null;
    conceptId: number | null;
    conceptUuid: string | null;
    stockBatchUuid: string;
    batchNumber: string;
    quantity: number;
    quantityUoM: string;
    quantityFactor: number;
    quantityUoMUuid: string;
    expiration: string;
    commonName: string | null;
    acronym: string | null;
    drugName: string | null;
    conceptName: string | null;
    links: {
      rel: string;
      uri: string;
      resourceAlias: string;
    }[];
    resourceVersion: string;
  }>;
  totalCount: number | null;
  total: number;
};

export type HIVTestResultFormData = z.infer<typeof hivTestResultSchema>;

export const useInventoryByConceptUuids = () => {
  const { hivTestKitMembersConceptUuids } = useConfig<ExpressWorkflowConfig>();
  const conceptUuids = useMemo(() => Object.values(hivTestKitMembersConceptUuids), [hivTestKitMembersConceptUuids]);
  const url = `${restBaseUrl}/stockmanagement/stockitem?v=default&conceptUuids=${conceptUuids.join()}`;
  const { data, isLoading, error, mutate } = useSWR(url, async (_url: string) => {
    const fetchTasks = conceptUuids.map(async (uuid) => {
      // Get concept name
      const consRes = await openmrsFetch<{ uuid: string; display: string }>(
        `${restBaseUrl}/concept/${uuid}?v=custom:(uuid,display)`,
      );
      const conceptName = consRes.data?.display;
      // Get stock Item by concept
      const itemRes = await openmrsFetch<{ results: Array<{ uuid: string }> }>(
        `${restBaseUrl}/stockmanagement/stockitem?v=default&conceptUuid=${conceptName}`,
      );
      const itemUuid = itemRes.data.results?.[0]?.uuid;
      if (!itemUuid) {
        return [];
      }
      // Get inventory b stock item UUID
      const invRes = await openmrsFetch<StockItemInventoryResponse>(
        `${restBaseUrl}/stockmanagement/stockiteminventory?v=default&limit=10&totalCount=true&stockItemUuid=${itemUuid}&includeBatchNo=true`,
      );
      const inventory = invRes.data.results ?? [];
      return inventory.map((inv) => ({ ...inv, conceptUuid: uuid }));
    });
    const res = await Promise.allSettled(fetchTasks);
    return res.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);
  });
  return {
    inventory: data,
    isLoading,
    error,
    mutate,
  };
};

export const useInventory = (conceptUuid: string) => {
  const url = `${restBaseUrl}/stockmanagement/stockiteminventory?v=default&limit=10&totalCount=true&conceptUuid=${conceptUuid}&includeBatchNo=true`;
  const { data, error, isLoading } = useSWR<FetchResponse<StockItemInventoryResponse>>(url, openmrsFetch);
  return {
    inventory: data?.data?.results ?? [],
    isLoading,
    error,
  };
};

export const useConceptMembers = (conceptUuid: string) => {
  const url = `${restBaseUrl}/concept/${conceptUuid}?v=custom:(setMembers)`;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<Concept>>(url, openmrsFetch);
  const members = useMemo<Array<Concept>>(() => data?.data?.setMembers ?? [], [data]);
  return {
    isLoading,
    mutate,
    error,
    members,
  };
};
