import { TabsSkeleton } from '@carbon/react';
import {
  ErrorState,
  ExtensionSlot,
  HomePictogram,
  PageHeader,
  PageHeaderContent,
  useConfig,
} from '@openmrs/esm-framework';
import capitalize from 'lodash-es/capitalize';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import QueueSummaryCards, { QueueSummaryCard } from '../../shared/queue/queue-summary-cards.component';
import QueueTab from '../../shared/queue/queue-tab.component';
import { QueueWorkflowProvider, useQueueWorkflowContext } from '../../shared/queue/queue-workflow-context';
import { Queue } from '../../types';
import { useHIVTestServiceQueues } from './hts.resources';
import styles from './hts.scss';
import { ExpressWorkflowConfig } from '../../config-schema';

type HTSProps = {
  dashboardTitle: string;
};

const HIVTestingServices: React.FC<HTSProps> = ({ dashboardTitle }) => {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader className={styles.pageHeader}>
        <PageHeaderContent title={t('hts', 'HTS')} illustration={<HomePictogram />} />
        <ExtensionSlot name="provider-banner-info-slot" />
      </PageHeader>
      <HTSQueueTab />
    </div>
  );
};

export default HIVTestingServices;

const HTSQueueTab: React.FC = () => {
  const { errorLoadingQueues, isLoadingQueues, htsQueues } = useHIVTestServiceQueues();
  const {
    queueStatusConceptUuids: { finishedStatus, waitingStatus, inServiceStatus },
  } = useConfig<ExpressWorkflowConfig>();
  const { t } = useTranslation();
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

  if (!htsQueues.length) {
    return (
      <div className={styles.contentArea}>
        <ErrorState
          headerTitle={t('noQueueRoomsConfigured', 'No queue rooms configured')}
          error={{
            response: { status: t('noQueueRoomsConfigured', 'No queue rooms configured') },
          }}
        />
      </div>
    );
  }
  return (
    <div>
      <QueueWorkflowProvider queues={htsQueues}>
        <HTSContent
          triageQueues={htsQueues}
          waitingStatus={waitingStatus}
          finishedStatus={finishedStatus}
          inServiceStatus={inServiceStatus}
        />
      </QueueWorkflowProvider>
    </div>
  );
};

type HTSContentProps = {
  triageQueues: Queue[];
  waitingStatus: string;
  finishedStatus: string;
  inServiceStatus: string;
};

const HTSContent: React.FC<HTSContentProps> = ({ triageQueues, waitingStatus, finishedStatus, inServiceStatus }) => {
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
        <QueueTab queues={triageQueues} navigatePath="hts" usePatientChart patientChartUrlSegement="hts" />
      )}
    </div>
  );
};
