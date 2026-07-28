import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { DataPipeline, TransmissionPipeline } from './trnsmission.type';
import { TFunction } from 'i18next';
import capitalize from 'lodash-es/capitalize';

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

export const getPipelineName = (pipeline: DataPipeline, t: TFunction) => {
  const toDisplay = (pipeline: DataPipeline) => capitalize(pipeline.replaceAll('_', ' '));

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
