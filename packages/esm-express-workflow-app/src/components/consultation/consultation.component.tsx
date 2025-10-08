import { InlineLoading } from '@carbon/react';
import { ExtensionSlot, HomePictogram, PageHeader, PageHeaderContent } from '@openmrs/esm-framework';
import styles from './consultation.scss';
import capitalize from 'lodash-es/capitalize';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueues } from '../../hooks/useServiceQueues';
import QueueTab from '../../shared/queue/queue-tab.component';
import { useConsultationQueueMetrics, useInvestigationMetrics } from './consultation.resources';
import { Queue } from '../../types';
type ConsultationProps = {
  dashboardTitle: string;
};

const Consultation: React.FC<ConsultationProps> = ({ dashboardTitle }) => {
  const { t } = useTranslation();
  const { queues, isLoading, error } = useQueues();
  const [currQueue, setCurrQueue] = useState<Queue>();
  const consultationQueues = queues.filter(
    (queue) =>
      queue.name.toLowerCase().includes('consultation') && !queue.location.display.toLowerCase().includes('mch'),
  );
  const {
    error: metricsError,
    isLoading: isLoadingMetrics,
    waitingEntries,
    urgentEntries,
    notUrgentEntries,
    emergencyEntries,
  } = useConsultationQueueMetrics(currQueue ?? consultationQueues[0]);
  const {
    isLoading: isLoadingInvestigationMetrics,
    awaitingInvestigation,
    completedInvestigation,
    error: investigationMetricsError,
  } = useInvestigationMetrics(currQueue ?? consultationQueues[0]);

  // TODO: Add actually get the values from the queues
  const cards = [
    {
      title: t('awaitingConsultation', 'Awaiting consultation'),
      value: (waitingEntries?.length ?? 0)?.toString(),
      subMetrics: [
        { subtitle: t('emergency', 'Emergency'), subValue: (emergencyEntries?.length ?? 0).toString() },
        { subtitle: t('urgent', 'Urgent'), subValue: (urgentEntries?.length ?? 0).toString() },
        { subtitle: t('notUrgent', 'Not Urgent'), subValue: (notUrgentEntries?.length ?? 0)?.toString() },
      ],
    },
    {
      title: t('investigationStatus', 'Investigation Status'),
      value: '0',
      subMetrics: [
        { subtitle: t('awaiting', 'Awaiting'), subValue: awaitingInvestigation.toString() },
        { subtitle: t('completed', 'Completed'), subValue: completedInvestigation.toString() },
      ],
    },
    { title: t('totalVisits', 'Total Visits'), value: '0' },
  ];

  if (isLoading) {
    return <InlineLoading description={t('loadingQueues', 'Loading queues...')} />;
  }
  return (
    <div className={`omrs-main-content`}>
      <PageHeader className={styles.pageHeader}>
        <PageHeaderContent title={capitalize(dashboardTitle)} illustration={<HomePictogram />} />
        <ExtensionSlot name="provider-banner-info-slot" />
      </PageHeader>
      <QueueTab
        queues={consultationQueues}
        cards={cards}
        navigatePath="consultation"
        usePatientChart
        onTabChanged={setCurrQueue}
      />
    </div>
  );
};

export default Consultation;
