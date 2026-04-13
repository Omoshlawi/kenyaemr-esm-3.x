import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type Order } from '@openmrs/esm-patient-common-lib';

export interface MalariaObsPayload {
  concept: { uuid: string };
  value: { uuid: string } | number;
  status: string;
  order: { uuid: string };
}

export function useMalariaResultsInvalidation(order: Order) {
  const { mutate } = useSWRConfig();
  const patientUuid = order.patient.uuid;

  const mutateOrderData = useCallback(() => {
    mutate(
      (key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/order?patient=${patientUuid}`),
      undefined,
      { revalidate: true },
    );
  }, [mutate, patientUuid]);

  const mutateObstreeData = useCallback(() => {
    mutate(
      (key) => {
        if (typeof key === 'string') {
          const obstreePattern = `${restBaseUrl}/obstree?patient=${patientUuid}`;
          return key.startsWith(obstreePattern) || key.startsWith(`$inf$${obstreePattern}`);
        }
        return false;
      },
      undefined,
      { revalidate: true },
    );
  }, [mutate, patientUuid]);

  const mutateEncounterData = useCallback(() => {
    mutate((key) => typeof key === 'string' && key.includes(`/encounter/${order.encounter.uuid}`), undefined, {
      revalidate: true,
    });
  }, [mutate, order.encounter.uuid]);

  return { mutateOrderData, mutateObstreeData, mutateEncounterData };
}

export async function saveMalariaLabResults(
  order: Order,
  obs: Array<MalariaObsPayload>,
  abortController: AbortController,
): Promise<void> {
  const encounterResponse = await openmrsFetch(`${restBaseUrl}/encounter/${order.encounter.uuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: JSON.stringify({ obs }),
  });

  if (!encounterResponse.ok) {
    throw new Error('Failed to save observations');
  }

  const discontinuationPayload = {
    previousOrder: order.uuid,
    type: 'testorder',
    action: 'DISCONTINUE',
    careSetting: order.careSetting.uuid,
    encounter: order.encounter.uuid,
    patient: order.patient.uuid,
    concept: order.concept.uuid,
    orderer: order.orderer,
  };

  const orderResponse = await openmrsFetch(`${restBaseUrl}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: JSON.stringify(discontinuationPayload),
  });

  if (orderResponse.status !== 201) {
    throw new Error('Failed to update order');
  }

  await openmrsFetch(`${restBaseUrl}/order/${order.uuid}/fulfillerdetails/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: JSON.stringify({ fulfillerStatus: 'COMPLETED', fulfillerComment: 'Test Results Entered' }),
  });
}
