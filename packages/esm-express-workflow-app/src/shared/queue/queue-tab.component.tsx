import React, { useState, useMemo, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import startCase from 'lodash-es/startCase';

import FiltersHeader from './filters-header.component';
import { type Queue, type QueueFilter } from '../../types/index';
import { useQueueEntries } from '../../hooks/useServiceQueues';
import QueueEntryTable from './queue-entry/queue-entry-table.component';
import styles from './queue-tab.scss';
import { useQueueWorkflowContextOptional } from './queue-workflow-context';

type QueueTabProps = {
  queues: Array<Queue>;
  navigatePath: string;
  onTabChanged?: (queue: Queue) => void;
  usePatientChart?: boolean;
  filters?: Array<QueueFilter>;
  onFiltersChanged?: (filters: Array<QueueFilter>) => void;
};

const startedOnOrAfter = dayjs().subtract(24, 'hour').format('YYYY-MM-DD HH:mm:ss');

const QueueTabWithContext: React.FC<
  QueueTabProps & {
    validQueues: Queue[];
    workflowContext: NonNullable<ReturnType<typeof useQueueWorkflowContextOptional>>;
  }
> = ({
  queues,
  navigatePath,
  usePatientChart,
  filters: filtersProp,
  onFiltersChanged: onFiltersChangedProp,
  validQueues,
  workflowContext,
}) => {
  const filters = workflowContext.filters ?? filtersProp ?? [];
  const onFiltersChanged = workflowContext.setFilters ?? onFiltersChangedProp;
  const onTabChanged = workflowContext.setCurrQueue;
  const { t } = useTranslation();
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const selectedQueue = validQueues[selectedTabIndex];
  const activeQueue = workflowContext.activeQueue;

  useEffect(() => {
    const index = validQueues.findIndex((q) => q?.uuid === activeQueue?.uuid);
    if (index >= 0 && index !== selectedTabIndex) {
      setSelectedTabIndex(index);
    }
  }, [activeQueue?.uuid, validQueues, selectedTabIndex]);

  const {
    queueEntries,
    isLoadingQueueEntries,
    isValidatingQueueEntries,
    queueEntriesError: error,
    queueEntriesPagination: pagination,
    pageSize,
    setPageSize,
  } = workflowContext;

  useEffect(() => {
    pagination?.goTo(1);
  }, [selectedQueue?.uuid]);

  const queueEntriesByService = useMemo(() => {
    if (!queueEntries?.length || !selectedQueue?.uuid) {
      return [];
    }
    const priorityFilter = filters?.find((filter) => filter.key === 'priority')?.value;
    const statusFilter =
      filters?.filter((filter) => filter.key === 'status')?.flatMap((filter) => filter.value.split(',')) ?? [];
    const serviceAwaitingFilter = filters?.find((filter) => filter.key === 'service_awaiting')?.value?.split(',') ?? [];
    const serviceCompletedFilter =
      filters?.find((filter) => filter.key === 'service_completed')?.value?.split(',') ?? [];
    return queueEntries.filter(
      (entry) =>
        entry?.queue?.uuid === selectedQueue?.uuid &&
        (statusFilter.length > 0 ? statusFilter.includes(entry?.status?.uuid) : true) &&
        (priorityFilter ? entry?.priority?.uuid === priorityFilter : true) &&
        (serviceAwaitingFilter.length > 0 ? serviceAwaitingFilter.includes(entry?.patient?.uuid) : true) &&
        (serviceCompletedFilter.length > 0 ? serviceCompletedFilter.includes(entry?.patient?.uuid) : true),
    );
  }, [filters, queueEntries, selectedQueue?.uuid]);

  const handleTabChange = useCallback(
    (evt: { selectedIndex: number }) => {
      setSelectedTabIndex(evt.selectedIndex);
      const newQueue = validQueues[evt.selectedIndex];
      if (newQueue) {
        onTabChanged?.(newQueue);
      }
    },
    [validQueues, onTabChanged],
  );

  if (error) {
    return (
      <div>
        {t('errorLoadingQueueEntries', 'Error loading queue entries')}: {error.message}
      </div>
    );
  }

  return (
    <div className={styles.queueTab}>
      <FiltersHeader filters={filters} onFiltersChanged={onFiltersChanged} />
      <div className={styles.tabsContainer}>
        <Tabs selectedIndex={selectedTabIndex} onChange={handleTabChange}>
          <TabList contained>
            {validQueues.map((queue) => (
              <Tab key={queue?.uuid}>{startCase(queue?.queueRooms[0]?.display)}</Tab>
            ))}
          </TabList>
          <TabPanels>
            {validQueues.map((queue) => (
              <TabPanel key={queue?.uuid}>
                <QueueEntryTable
                  queueEntries={queueEntriesByService}
                  navigatePath={navigatePath}
                  usePatientChart={usePatientChart}
                  pagination={pagination}
                  onPageSizeChange={setPageSize}
                  isLoading={isLoadingQueueEntries}
                  isValidating={isValidatingQueueEntries}
                />
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
};

const QueueTabWithoutContext: React.FC<QueueTabProps> = ({
  queues,
  navigatePath,
  onTabChanged: onTabChangedProp,
  usePatientChart,
  filters: filtersProp,
  onFiltersChanged: onFiltersChangedProp,
}) => {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState(10);
  const validQueues = useMemo(() => queues.filter((queue) => queue?.queueRooms?.length > 0), [queues]);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const selectedQueue = validQueues[selectedTabIndex];

  const {
    queueEntries,
    isLoading: isLoadingQueueEntries,
    isValidating: isValidatingQueueEntries,
    error,
    pagination,
  } = useQueueEntries(
    {
      location: selectedQueue?.location?.uuid ? [selectedQueue.location.uuid] : undefined,
      startedOnOrAfter,
      queues: [selectedQueue?.uuid],
    },
    pageSize,
  );

  useEffect(() => {
    pagination?.goTo(1);
  }, [selectedQueue?.uuid]);

  const filters = filtersProp ?? [];
  const onFiltersChanged = onFiltersChangedProp;
  const onTabChanged = onTabChangedProp;

  const queueEntriesByService = useMemo(() => {
    if (!queueEntries?.length || !selectedQueue?.uuid) {
      return [];
    }
    const priorityFilter = filters?.find((filter) => filter.key === 'priority')?.value;
    const statusFilter =
      filters?.filter((filter) => filter.key === 'status')?.flatMap((filter) => filter.value.split(',')) ?? [];
    const serviceAwaitingFilter = filters?.find((filter) => filter.key === 'service_awaiting')?.value?.split(',') ?? [];
    const serviceCompletedFilter =
      filters?.find((filter) => filter.key === 'service_completed')?.value?.split(',') ?? [];
    return queueEntries.filter(
      (entry) =>
        entry?.queue?.uuid === selectedQueue?.uuid &&
        (statusFilter.length > 0 ? statusFilter.includes(entry?.status?.uuid) : true) &&
        (priorityFilter ? entry?.priority?.uuid === priorityFilter : true) &&
        (serviceAwaitingFilter.length > 0 ? serviceAwaitingFilter.includes(entry?.patient?.uuid) : true) &&
        (serviceCompletedFilter.length > 0 ? serviceCompletedFilter.includes(entry?.patient?.uuid) : true),
    );
  }, [filters, queueEntries, selectedQueue?.uuid]);

  const handleTabChange = useCallback(
    (evt: { selectedIndex: number }) => {
      setSelectedTabIndex(evt.selectedIndex);
      const newQueue = validQueues[evt.selectedIndex];
      if (newQueue) {
        onTabChanged?.(newQueue);
      }
    },
    [validQueues, onTabChanged],
  );

  if (error) {
    return (
      <div>
        {t('errorLoadingQueueEntries', 'Error loading queue entries')}: {error.message}
      </div>
    );
  }

  return (
    <div className={styles.queueTab}>
      <FiltersHeader filters={filters} onFiltersChanged={onFiltersChanged} />
      <div className={styles.tabsContainer}>
        <Tabs selectedIndex={selectedTabIndex} onChange={handleTabChange}>
          <TabList contained>
            {validQueues.map((queue) => (
              <Tab key={queue?.uuid}>{startCase(queue?.queueRooms[0]?.display)}</Tab>
            ))}
          </TabList>
          <TabPanels>
            {validQueues.map((queue) => (
              <TabPanel key={queue?.uuid}>
                <QueueEntryTable
                  queueEntries={queueEntriesByService}
                  navigatePath={navigatePath}
                  usePatientChart={usePatientChart}
                  pagination={pagination}
                  onPageSizeChange={setPageSize}
                  isLoading={isLoadingQueueEntries}
                  isValidating={isValidatingQueueEntries}
                />
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
};

const QueueTab: React.FC<QueueTabProps> = (props) => {
  const workflowContext = useQueueWorkflowContextOptional();
  const { t } = useTranslation();
  const validQueues = useMemo(() => props.queues.filter((queue) => queue?.queueRooms?.length > 0), [props.queues]);

  if (!props.queues || props.queues.length === 0) {
    return <div>{t('noQueuesAvailable', 'No queues available')}</div>;
  }

  if (validQueues.length === 0) {
    return <div>{t('noQueueRooms', 'No queue rooms configured')}</div>;
  }

  if (!validQueues[0]) {
    return <div>{t('noQueueSelected', 'Please select a queue')}</div>;
  }

  if (workflowContext) {
    return <QueueTabWithContext {...props} validQueues={validQueues} workflowContext={workflowContext} />;
  }

  return <QueueTabWithoutContext {...props} />;
};

export default QueueTab;
