import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { useQueueEntries } from '../../hooks/useServiceQueues';
import { Queue } from '../../types';
import { ExpressWorkflowConfig } from '../../config-schema';
import { useMemo } from 'react';

export const useConsultationQueueMetrics = (queue?: Queue) => {
  const { queueServiceConceptUuids, queuStatusConceptUuids, concepts } = useConfig<ExpressWorkflowConfig>();

  const {
    queueEntries: waitingEntries,
    isLoading: isLoadingWaiting,
    error: waitingError,
  } = useQueueEntries({
    service: [queueServiceConceptUuids.consultationService],
    statuses: [queuStatusConceptUuids.waitingStatus],
    location: queue?.location?.uuid ? [queue.location.uuid] : undefined,
  });

  const {
    queueEntries: inServiceEntries,
    isLoading: isLoadingInService,
    error: inServiceError,
  } = useQueueEntries({
    service: [queueServiceConceptUuids.consultationService],
    statuses: [queuStatusConceptUuids.inServiceStatus],
    location: queue?.location?.uuid ? [queue.location.uuid] : undefined,
  });
  const {
    queueEntries: finishedEntries,
    isLoading: isLoadingFinished,
    error: finishedError,
  } = useQueueEntries({
    service: [queueServiceConceptUuids.consultationService],
    statuses: [queuStatusConceptUuids.finishedStatus],
    location: queue?.location?.uuid ? [queue.location.uuid] : undefined,
  });

  const urgentEntries = useMemo(
    () => waitingEntries.filter((entry) => entry.priority.uuid === concepts.urgentPriorityConceptUuid),
    [waitingEntries, concepts],
  );
  const notUrgentEntries = useMemo(
    () => waitingEntries.filter((entry) => entry.priority.uuid === concepts.defaultPriorityConceptUuid),
    [waitingEntries, concepts],
  );
  const emergencyEntries = useMemo(
    () => waitingEntries.filter((entry) => entry.priority.uuid === concepts.emergencyPriorityConceptUuid),
    [waitingEntries, concepts],
  );

  return {
    isLoading: isLoadingFinished || isLoadingInService || isLoadingWaiting,
    waitingEntries,
    inServiceEntries,
    finishedEntries,
    error: finishedError ?? inServiceError ?? waitingError,
    urgentEntries,
    notUrgentEntries,
    emergencyEntries,
  };
};

// TODO ------WIP -----------
export const useInvestigationMetrics = (queue?: Queue) => {
  const { queueServiceConceptUuids, queuStatusConceptUuids } = useConfig<ExpressWorkflowConfig>();
  const {
    queueEntries,
    isLoading: isLoadingEntries,
    error: entrieseError,
  } = useQueueEntries({
    service: [queueServiceConceptUuids.consultationService],
    statuses: [queuStatusConceptUuids.inServiceStatus],
    location: queue?.location?.uuid ? [queue.location.uuid] : undefined,
  });

  const awaitingInvestigation = useMemo(() => 0, []);
  const completedInvestigation = useMemo(() => 0, []);

  return {
    isLoading: isLoadingEntries,
    error: entrieseError,
    awaitingInvestigation,
    completedInvestigation,
  };
};

const patientHasIncompleteOrder = async (patientUuid: string) => {
  const url = `${restBaseUrl}/order/?patient=${patientUuid}&fulfillerStatus=IN_PROGRESS`; // COMPLETED
  const res = await openmrsFetch(url);
};
