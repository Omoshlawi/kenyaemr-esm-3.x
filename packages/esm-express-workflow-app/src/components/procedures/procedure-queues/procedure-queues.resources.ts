import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { useMemo } from 'react';
import { ExpressWorkflowConfig } from '../../../config-schema';
import { useQueues } from '../../../hooks/useServiceQueues';
import type { QueueEntry, QueueEntryPayload } from '../../../types';

export const addPatientToQueue = async (payload: QueueEntryPayload) => {
  const url = `${restBaseUrl}/visit-queue-entry`;
  const res = await openmrsFetch<QueueEntry>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
  });
  return res.data;
};
export const useProcedureServiceQueues = () => {
  const { queues, isLoading: isLoadingQueues, error: errorLoadingQueues } = useQueues();
  const {
    queueServiceConceptUuids: { procedureService },
  } = useConfig<ExpressWorkflowConfig>();

  const procedureQueues = useMemo(
    () =>
      queues
        .filter((queue) => queue.service.uuid === procedureService && queue?.queueRooms?.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [queues, procedureService],
  );

  return {
    procedureQueues,
    isLoadingQueues,
    errorLoadingQueues,
  };
};
