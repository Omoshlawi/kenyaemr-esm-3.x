import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import {
  DataPipeline,
  DatasetMetric,
  FailedDataset,
  PipelineStatus,
  QueueSummary,
  TransmissionPipeline,
} from './transmission.type';
import { TFunction } from 'i18next';
import capitalize from 'lodash-es/capitalize';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

export const useDataPipelines = () => {
  const url = `${restBaseUrl}/kenyaemril/datapipeline/pipelines`;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<Array<TransmissionPipeline>>>(url, openmrsFetch);
  return {
    pipelines: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
};

export const usePipelineMetrics = (pipeline: TransmissionPipeline) => {
  const queueSummaryUrl = `${restBaseUrl}/kenyaemril/datapipeline/${pipeline.slug}/queue-summary`;
  const { t } = useTranslation();
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<QueueSummary>>(queueSummaryUrl, openmrsFetch);
  const queueSummary = data?.data ?? null;
  const queueItems = useMemo(
    () => [
      { label: getPipelineStatusDisplay(PipelineStatus.PENDING, t), value: queueSummary?.PENDING ?? 0 },
      { label: getPipelineStatusDisplay(PipelineStatus.IN_PROGRESS, t), value: queueSummary?.IN_PROGRESS ?? 0 },
      { label: getPipelineStatusDisplay(PipelineStatus.SENT, t), value: queueSummary?.SENT ?? 0 },
      { label: getPipelineStatusDisplay(PipelineStatus.FAILED, t), value: queueSummary?.FAILED ?? 0 },
      { label: getPipelineStatusDisplay(PipelineStatus.DEAD_LETTER, t), value: queueSummary?.DEAD_LETTER ?? 0 },
      { label: getPipelineStatusDisplay(PipelineStatus.TOTAL, t), value: queueSummary?.TOTAL ?? 0 },
    ],
    [
      queueSummary?.DEAD_LETTER,
      queueSummary?.FAILED,
      queueSummary?.IN_PROGRESS,
      queueSummary?.PENDING,
      queueSummary?.SENT,
      queueSummary?.TOTAL,
      t,
    ],
  );

  const configItems = useMemo(
    () => [
      { label: t('maxRetries', 'Max retries'), value: pipeline.maxRetries ?? 0 },
      { label: t('transmissionBatchSize', 'Transmission batch size'), value: pipeline?.transmissionBatchSize ?? 0 },
      { label: t('cleanupRetentionDays', 'Cleanup Retention In days'), value: pipeline?.cleanupRetentionDays ?? 0 },
    ],
    [pipeline?.cleanupRetentionDays, pipeline.maxRetries, pipeline?.transmissionBatchSize, t],
  );
  return {
    queueSummary,
    queueItems,
    configItems,
    isLoading,
    error,
  };
};

export const usePipelineFailedDataset = (pipelineSlug: string) => {
  const failedUrl = `${restBaseUrl}/kenyaemril/datapipeline/${pipelineSlug}/failed`;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<Array<FailedDataset>>>(failedUrl, openmrsFetch);
  return {
    failedDatasets: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
};

export const usePipelinePushedDataset = (pipelineSlug: string) => {
  const pushedUrl = `${restBaseUrl}/kenyaemril/datapipeline/${pipelineSlug}/pushed`;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<Array<DatasetMetric>>>(pushedUrl, openmrsFetch);
  return {
    pushedDatasets: data?.data ?? [],
    isLoading,
    mutate,
    error,
  };
};

export const usePipelineExtractedDataset = (pipelineSlug: string) => {
  const extractedUrl = `${restBaseUrl}/kenyaemril/datapipeline/${pipelineSlug}/extracted`;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<Array<DatasetMetric>>>(extractedUrl, openmrsFetch);
  return {
    extractedDatasets: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
};
const toDisplay = (str: string) => capitalize(str.replaceAll('_', ' '));
export const getPipelineName = (pipeline: DataPipeline, t: TFunction) => {
  switch (pipeline) {
    case DataPipeline.CASE_SURVEILLANCE:
      return t(DataPipeline.CASE_SURVEILLANCE, toDisplay(DataPipeline.CASE_SURVEILLANCE));
    case DataPipeline.VISUALIZATION:
      return t(DataPipeline.VISUALIZATION, toDisplay(DataPipeline.VISUALIZATION));
    case DataPipeline.DMI:
      return t(DataPipeline.DMI, toDisplay(DataPipeline.DMI));
    default:
      return t('unknownPipeline', 'Uknown pipeline');
  }
};

export const getPipelineStatusDisplay = (status: PipelineStatus, t: TFunction) => {
  switch (status) {
    case PipelineStatus.TOTAL:
      return t(PipelineStatus.TOTAL, toDisplay(PipelineStatus.TOTAL));
    case PipelineStatus.DEAD_LETTER:
      return t(PipelineStatus.DEAD_LETTER, toDisplay(PipelineStatus.DEAD_LETTER));
    case PipelineStatus.FAILED:
      return t(PipelineStatus.FAILED, toDisplay(PipelineStatus.FAILED));
    case PipelineStatus.IN_PROGRESS:
      return t(PipelineStatus.IN_PROGRESS, toDisplay(PipelineStatus.IN_PROGRESS));
    case PipelineStatus.PENDING:
      return t(PipelineStatus.PENDING, toDisplay(PipelineStatus.PENDING));
    case PipelineStatus.SENT:
      return t(PipelineStatus.SENT, toDisplay(PipelineStatus.SENT));
    default:
      return t('uknownStatus', 'Uknown status');
  }
};
