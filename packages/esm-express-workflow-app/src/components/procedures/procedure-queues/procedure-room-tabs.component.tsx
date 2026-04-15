import { Tab, TabList, TabPanel, TabPanels, Tabs, TabsSkeleton } from '@carbon/react';
import { ErrorState } from '@openmrs/esm-framework';
import React from 'react';
import { useTranslation } from 'react-i18next';

import startCase from 'lodash/startCase';
import { Queue } from '../../../types';
import styles from './procedure-rooms.scss';
import QueueProcedureTabs from './queue-procedure-tabs.component';

type ProcedureRoomTabsProps = {
  activeQueue: string;
  onActiveQueueChange: (queue: string) => void;
  procedureQueues: Queue[];
  isLoadingQueues: boolean;
  errorLoadingQueues: Error;
};

const ProcedureRoomTabs: React.FC<ProcedureRoomTabsProps> = ({
  activeQueue,
  onActiveQueueChange,
  procedureQueues,
  isLoadingQueues,
  errorLoadingQueues,
}) => {
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

  if (!procedureQueues.length) {
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
    <div className={styles.tabsContainer}>
      <Tabs
        selectedIndex={procedureQueues.findIndex((queue) => queue.uuid === activeQueue)}
        onChange={({ selectedIndex }) => {
          onActiveQueueChange(procedureQueues[selectedIndex].uuid);
        }}>
        <TabList contained>
          {procedureQueues.map((queue) => (
            <Tab key={queue?.uuid}>{startCase(queue?.queueRooms?.[0]?.display)}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {procedureQueues.map((queue) => (
            <TabPanel key={queue?.uuid}>
              <QueueProcedureTabs queue={queue.uuid} />
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default ProcedureRoomTabs;
