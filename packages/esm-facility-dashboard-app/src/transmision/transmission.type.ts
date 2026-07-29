export enum DataPipeline {
  CASE_SURVEILLANCE = 'CASE_SURVEILLANCE',
  VISUALIZATION = 'VISUALIZATION',
  DMI = 'DMI',
}

export type TransmissionPipeline = {
  pipeline: DataPipeline;
  slug: string;
  basePath: string;
  extractionOnDemand: boolean;
  maxRetries: number;
  transmissionBatchSize: number;
  cleanupRetentionDays: number;
};

export enum PipelineStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER',
  TOTAL = 'TOTAL',
}

export type QueueSummary = {
  [PipelineStatus.PENDING]: number;
  [PipelineStatus.IN_PROGRESS]: number;
  [PipelineStatus.SENT]: number;
  [PipelineStatus.FAILED]: number;
  [PipelineStatus.DEAD_LETTER]: number;
  [PipelineStatus.TOTAL]: number;
};

export type DatasetMetric = {
  day: string;
  datasetType: string;
  records: number;
  datasets: number;
};

export type FailedDataset = {
  queueId: number;
  pipeline: DataPipeline;
  batchUuid: string;
  datasetType: string;
  recordCount: number;
  status: 'FAILED' | 'DEAD_LETTER' | string;
  retryCount: number;
  maxRetries: number;
  httpResponseCode: number | null;
  lastError: string | null;
  nextAttemptTime: string | null;
  lastAttemptTime: string | null;
  extractedAt: string | null;
  sentAt: string | null;
  fetchDate: string | null;
};
