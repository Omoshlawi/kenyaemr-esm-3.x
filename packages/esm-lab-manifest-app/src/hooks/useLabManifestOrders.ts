import { FetchResponse, openmrsFetch, restBaseUrl, useDebounce } from '@openmrs/esm-framework';
import { useState } from 'react';
import useSWR from 'swr';
import { Order } from '@openmrs/esm-patient-common-lib';
import { getPatientIdentifierFromPayload } from '../utils/patient-identifier-display';

export interface LabManifestSample {
  uuid: string;
  id: number;
  labManifest: LabManifest;
  order: Order & { patient: Patient };
  sampleType: string;
  payload: string;
  patientIdentifier?: string;
  dateSent?: string;
  status: string;
  result?: string;
  resultDate?: string;
  sampleCollectionDate: string;
  sampleSeparationDate: string;
  lastStatusCheckDate?: string;
  sampleReceivedDate?: string;
  sampleTestedDate?: string;
  resultsPulledDate?: string;
  resultsDispatchDate?: string;
  orderType?: string;
  batchNumber?: string;
  resourceVersion: string;
}

export interface LabManifest {
  uuid: string;
  identifier?: string;
  status: string;
  labManifestOrders: Array<LabManifestOrder>;
}

export interface LabManifestOrder {
  uuid: string;
  id: number;
  sampleType: string;
  status: string;
}
export interface Patient {
  uuid: string;
  display: string;
  identifiers?: Array<{ identifier: string; identifierType: { uuid: string } }>;
}

const enrichManifestSample = (sample: LabManifestSample): LabManifestSample => {
  const patientIdentifier =
    sample.patientIdentifier?.trim() ||
    getPatientIdentifierFromPayload(sample.payload, true) ||
    getPatientIdentifierFromPayload(sample.payload, false);

  return patientIdentifier ? { ...sample, patientIdentifier } : sample;
};

const useLabManifestOrders = (manifestUuid: string) => {
  const [search, setSearch] = useState<string>('');
  const val = useDebounce(search, 500);
  const urls = `${restBaseUrl}/labmanifestorder?v=full&manifestuuid=${manifestUuid}&q=${val}`;
  const { data, isLoading, error, mutate } = useSWR<FetchResponse<{ results: Array<LabManifestSample> }>>(
    urls,
    openmrsFetch,
    {
      refreshInterval: 60000,
    },
  );
  return {
    labManifestOrders: (data?.data?.results ?? []).map(enrichManifestSample),
    searchValue: search,
    setSearchValue: setSearch,
    isLoading,
    error,
    mutate,
  };
};

export default useLabManifestOrders;
