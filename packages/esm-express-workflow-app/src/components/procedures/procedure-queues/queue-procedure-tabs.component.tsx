import { ExtensionSlot, Order } from '@openmrs/esm-framework';
import React, { FC, useCallback } from 'react';
import { useQueueEntries } from '../../../hooks/useServiceQueues';

type QueueProcedureTabsProps = {
  queue: string;
};
const QueueProcedureTabs: FC<QueueProcedureTabsProps> = ({ queue }) => {
  const {
    queueEntries,
    isLoading: isLoadingQueueEntries,
    error: errorQueueEntries,
  } = useQueueEntries({ queues: [queue] });
  const isPatientInQueueByOrder = useCallback(
    (order: Order) => {
      return queueEntries?.some((entry) => entry.patient.uuid === order.patient.uuid);
    },
    [queueEntries],
  );
  const isPatientInQueueByPatient = useCallback(
    (patientUuid: string) => {
      return queueEntries?.some((entry) => entry.patient.uuid === patientUuid);
    },
    [queueEntries],
  );
  return (
    <ExtensionSlot
      name={'procedure-ordered-tabs-extension'}
      state={{ filterByOrder: isPatientInQueueByOrder, filterByPatient: isPatientInQueueByPatient }}
    />
  );
};

export default QueueProcedureTabs;
