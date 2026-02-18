import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';

import { type ExpressWorkflowConfig } from '../../config-schema';
import QueueSummaryCards from '../../shared/queue/queue-summary-cards.component';
import { useConsultationContext } from './consultation-context';
import { useConsultationQueueMetrics, useInvestigationStats, useTotalVisits } from './consultation.resource';
import { buildConsultationCards } from './consultation.utils';

type LoadingState = { isLoading: boolean; isValidating: boolean };

type ConsultationSummaryCardsProps = {
  onLoadingStateChange?: (state: LoadingState) => void;
};

const ConsultationSummaryCards: React.FC<ConsultationSummaryCardsProps> = ({ onLoadingStateChange }) => {
  const { activeQueue, setFilters, pageSize } = useConsultationContext();
  const { t } = useTranslation();
  const {
    priorities: { emergencyPriorityConceptUuid, urgentPriorityConceptUuid, notUrgentPriorityConceptUuid },
  } = useConfig<ExpressWorkflowConfig>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    waitingEntries,
    isLoading: isLoadingQueueMetrics,
    isValidating: isValidatingQueueMetrics,
    emergencyEntries,
    urgentEntries,
    notUrgentEntries,
  } = useConsultationQueueMetrics(activeQueue, pageSize);
  const {
    data: totalVisits,
    isLoading: isLoadingTotalVisits,
    isValidating: isValidatingTotalVisits,
  } = useTotalVisits();
  const {
    awaitingCount,
    completedCount,
    lab,
    radiology,
    procedures,
    isLoading: isLoadingInvestigations,
    refresh: refreshInvestigations,
    investigationCategorizedEntries,
    isValidating: isValidatingInvestigations,
  } = useInvestigationStats(activeQueue);

  const isLoading =
    (isLoadingQueueMetrics || isLoadingTotalVisits || isLoadingInvestigations) && !isValidatingQueueMetrics;
  const isValidating = isValidatingQueueMetrics || isValidatingInvestigations || isValidatingTotalVisits;

  useEffect(() => {
    onLoadingStateChange?.({ isLoading, isValidating });
  }, [isLoading, isValidating, onLoadingStateChange]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshInvestigations();
    } catch (error) {
      console.error('Error refreshing investigations:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshInvestigations]);

  const cards = useMemo(
    () =>
      buildConsultationCards({
        t,
        waitingCount: waitingEntries.length,
        emergencyCount: emergencyEntries.length,
        urgentCount: urgentEntries.length,
        notUrgentCount: notUrgentEntries.length,
        awaitingCount,
        completedCount,
        labAwaiting: lab.awaiting,
        labCompleted: lab.completed,
        radiologyAwaiting: radiology.awaiting,
        radiologyCompleted: radiology.completed,
        proceduresAwaiting: procedures.awaiting,
        proceduresCompleted: procedures.completed,
        isRefreshing,
        isLoadingInvestigations,
        onRefreshInvestigations: handleRefresh,
        totalVisitsCount: totalVisits?.length,
        setFilters,
        emergencyPriorityConceptUuid,
        urgentPriorityConceptUuid,
        notUrgentPriorityConceptUuid,
        investigationCategorizedEntries,
      }),
    [
      t,
      waitingEntries.length,
      emergencyEntries.length,
      urgentEntries.length,
      notUrgentEntries.length,
      awaitingCount,
      completedCount,
      lab.awaiting,
      lab.completed,
      radiology.awaiting,
      radiology.completed,
      procedures.awaiting,
      procedures.completed,
      isRefreshing,
      isLoadingInvestigations,
      handleRefresh,
      totalVisits?.length,
      setFilters,
      emergencyPriorityConceptUuid,
      urgentPriorityConceptUuid,
      notUrgentPriorityConceptUuid,
      investigationCategorizedEntries,
    ],
  );

  return <QueueSummaryCards cards={cards} />;
};

export default ConsultationSummaryCards;
