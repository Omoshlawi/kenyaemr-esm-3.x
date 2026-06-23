import { useConfig } from '@openmrs/esm-framework';
import { ExpressWorkflowConfig } from '../../config-schema';
import { useMemo } from 'react';
import { useQueues } from '../../hooks/useServiceQueues';

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
