import React, { useMemo } from 'react';
import capitalize from 'lodash-es/capitalize';
import { useTranslation } from 'react-i18next';
import {
  PageHeader,
  HomePictogram,
  ErrorState,
  PageHeaderContent,
  ExtensionSlot,
  useConfig,
} from '@openmrs/esm-framework';
import { TabsSkeleton } from '@carbon/react';

import { useQueues } from '../../hooks/useServiceQueues';
import QueueTab from '../../shared/queue/queue-tab.component';
import QueueSummaryCards, { QueueSummaryCard } from '../../shared/queue/queue-summary-cards.component';
import { QueueWorkflowProvider, useQueueWorkflowContext } from '../../shared/queue/queue-workflow-context';
import styles from './triage.scss';
import { Queue } from '../../types';
import { ExpressWorkflowConfig } from '../../config-schema';

type TriageProps = {
  dashboardTitle: string;
};

const Triage: React.FC<TriageProps> = ({ dashboardTitle }) => {
  return (
    <div>
      <PageHeader className={styles.pageHeader}>
        <PageHeaderContent title={capitalize(dashboardTitle)} illustration={<HomePictogram />} />
        <ExtensionSlot name="provider-banner-info-slot" />
      </PageHeader>
      <TriageQueueTab />
    </div>
  );
};

export default Triage;

const TriageQueueTab: React.FC = () => {
  const { t } = useTranslation();
  const {
    queueStatusConceptUuids: { finishedStatus, waitingStatus, inServiceStatus },
    queueServiceConceptUuids,
  } = useConfig<ExpressWorkflowConfig>();

  const { queues, isLoading: isLoadingQueues, error: errorLoadingQueues } = useQueues();

  const triageQueues = useMemo(
    () =>
      queues
        .filter(
          (queue) =>
            queue.service.uuid === queueServiceConceptUuids.triageService &&
            !queue.location.display.toLowerCase().includes('mch') &&
            queue?.queueRooms?.length > 0,
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [queues, queueServiceConceptUuids.triageService],
  );

  if (isLoadingQueues) {
    return (
      <div className={styles.contentArea}>
        <TabsSkeleton />
      </div>
    );
  }

  if (errorLoadingQueues) {
    return (
      <div className={styles.contentArea}>
        <ErrorState error={errorLoadingQueues} headerTitle={t('errorLoadingQueues', 'Error loading queues')} />
      </div>
    );
  }

  if (!triageQueues.length) {
    return <div className={styles.contentArea} />;
  }

  return (
    <QueueWorkflowProvider queues={triageQueues}>
      <TriageContent
        triageQueues={triageQueues}
        waitingStatus={waitingStatus}
        finishedStatus={finishedStatus}
        inServiceStatus={inServiceStatus}
      />
    </QueueWorkflowProvider>
  );
};

type TriageContentProps = {
  triageQueues: Queue[];
  waitingStatus: string;
  finishedStatus: string;
  inServiceStatus: string;
};

const TriageContent: React.FC<TriageContentProps> = ({
  triageQueues,
  waitingStatus,
  finishedStatus,
  inServiceStatus,
}) => {
  const { t } = useTranslation();
  const { queueEntries, setFilters, queueEntriesError } = useQueueWorkflowContext();

  const waitingEntries = useMemo(
    () => queueEntries.filter((entry) => entry?.status?.uuid === waitingStatus),
    [queueEntries, waitingStatus],
  );

  const attendedToEntries = useMemo(
    () =>
      queueEntries.filter((entry) => entry?.status?.uuid === inServiceStatus || entry?.status?.uuid === finishedStatus),
    [queueEntries, inServiceStatus, finishedStatus],
  );

  const cards: Array<QueueSummaryCard> = [
    {
      title: t('clientsPatientsWaiting', 'Clients/Patients waiting'),
      value: waitingEntries.length.toString(),
      onClick: () => {
        setFilters((prev) => [
          ...prev.filter((f) => f.key !== 'status'),
          { key: 'status', value: waitingStatus, label: t('waiting', 'Waiting') },
        ]);
      },
    },
    {
      title: t('clientsPatientsAttendedTo', 'Clients/Patients attended to'),
      value: attendedToEntries.length.toString(),
      onClick: () => {
        setFilters((prev) => [
          ...prev.filter((f) => f.key !== 'status'),
          { key: 'status', value: `${finishedStatus},${inServiceStatus}`, label: t('attendedTo', 'Attended to') },
        ]);
      },
    },
  ];

  return (
    <div className={styles.contentArea}>
      <QueueSummaryCards cards={cards} />
      {queueEntriesError ? (
        <ErrorState
          error={queueEntriesError}
          headerTitle={t('errorLoadingQueueEntries', 'Error loading queue entries')}
        />
      ) : (
        <QueueTab queues={triageQueues} navigatePath="triage" usePatientChart />
      )}
    </div>
  );
};
