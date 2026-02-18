import React, { createContext, useContext, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Queue, QueueFilter, QueueEntry, QueueEntriesPagination } from '../../types';
import { useQueueEntries } from '../../hooks/useServiceQueues';

const startedOnOrAfter = dayjs().subtract(24, 'hour').format('YYYY-MM-DD HH:mm:ss');

export type QueueWorkflowContextValue = {
  activeQueue: Queue | undefined;
  setCurrQueue: (queue: Queue | undefined) => void;
  filters: QueueFilter[];
  setFilters: React.Dispatch<React.SetStateAction<QueueFilter[]>>;
  queueEntries: QueueEntry[];
  isLoadingQueueEntries: boolean;
  isValidatingQueueEntries: boolean;
  queueEntriesError: Error | null;
  queueEntriesPagination: QueueEntriesPagination | undefined;
  pageSize: number;
  setPageSize: (size: number) => void;
};

const QueueWorkflowContext = createContext<QueueWorkflowContextValue | null>(null);

export type QueueWorkflowProviderProps = {
  queues: Queue[];
  children: React.ReactNode;
};

export const QueueWorkflowProvider: React.FC<QueueWorkflowProviderProps> = ({ queues, children }) => {
  const [currQueue, setCurrQueue] = useState<Queue>();
  const [filters, setFilters] = useState<QueueFilter[]>([]);
  const [pageSize, setPageSize] = useState(10);

  const activeQueue = currQueue ?? queues[0];

  const {
    queueEntries,
    isLoading: isLoadingQueueEntries,
    isValidating: isValidatingQueueEntries,
    error: queueEntriesError,
    pagination: queueEntriesPagination,
  } = useQueueEntries(
    activeQueue
      ? {
          location: activeQueue.location?.uuid ? [activeQueue.location.uuid] : undefined,
          startedOnOrAfter,
          queues: [activeQueue.uuid],
        }
      : { queues: ['00000000-0000-0000-0000-000000000000'], startedOnOrAfter },
    pageSize,
  );

  const value = useMemo(
    () => ({
      activeQueue,
      setCurrQueue,
      filters,
      setFilters,
      queueEntries: queueEntries ?? [],
      isLoadingQueueEntries,
      isValidatingQueueEntries,
      queueEntriesError: queueEntriesError ?? null,
      queueEntriesPagination,
      pageSize,
      setPageSize,
    }),
    [
      activeQueue,
      filters,
      queueEntries,
      isLoadingQueueEntries,
      isValidatingQueueEntries,
      queueEntriesError,
      queueEntriesPagination,
      pageSize,
    ],
  );

  return <QueueWorkflowContext.Provider value={value}>{children}</QueueWorkflowContext.Provider>;
};

export const useQueueWorkflowContext = () => {
  const ctx = useContext(QueueWorkflowContext);
  if (!ctx) {
    throw new Error('useQueueWorkflowContext must be used within QueueWorkflowProvider');
  }
  return ctx;
};

export const useQueueWorkflowContextOptional = () => useContext(QueueWorkflowContext);
