import React from 'react';
import { Queue } from '../../types';
import {
  QueueWorkflowProvider,
  useQueueWorkflowContext,
  useQueueWorkflowContextOptional,
} from '../../shared/queue/queue-workflow-context';

type ConsultationProviderProps = {
  consultationQueues: Queue[];
  children: React.ReactNode;
};

export const ConsultationProvider: React.FC<ConsultationProviderProps> = ({ consultationQueues, children }) => (
  <QueueWorkflowProvider queues={consultationQueues}>{children}</QueueWorkflowProvider>
);

export const useConsultationContext = () => useQueueWorkflowContext();
export const useConsultationContextOptional = () => useQueueWorkflowContextOptional();
