import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';

export interface PatientPreauth {
  claimUuid: string;
  authorizationCode: string;
  workflowState: string | null;
  serviceType: string | null;
  invoiceNumber: string | null;
  dateCreated: string | null;
  interventionCode: string | null;
  interventionName: string | null;
  tariff: string | null;
  isElective: boolean;
  isToday: boolean;
  canUseForCheckin: boolean;
  visitLinked: boolean;
}

export interface PatientPreauthorsResponse {
  patientUuid: string;
  total: number;
  results: Array<PatientPreauth>;
}
