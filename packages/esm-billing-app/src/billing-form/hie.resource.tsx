import { openmrsFetch, useConfig, usePatient } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { BillingConfig } from '../config-schema';
import { virtualClaimBaseUrl } from '../claims/claims-management/table/virtual-claim-preauth/constants';

export interface EligibilityResponse {
  requestIdType: number;
  requestIdNumber: string;
  memberCrNumber: string;
  whitelistedForOTP: boolean;
  facilityBiometricsEnforced: boolean;
  fullName: string;
  statusCode: string;
  statusDesc: string;
  schemes: Array<Scheme>;
  dateOfBirth?: string;
  gender?: string;
  age?: number;
}

export interface Scheme {
  schemeName: string;
  schemeId: number;
  memberType: 'PRIMARY' | 'BENEFICIARY';
  policy: {
    startDate: string;
    endDate: string;
    number: string;
  };
  coverage: {
    startDate: string;
    endDate: string;
    message: string;
    reason: string;
    possibleSolution?: string | null;
    status: string;
  };
  principalContributor: {
    idNumber: string;
    idType: string;
    crNumber: string;
    name: string;
    relationship: string | null;
    employmentType: string;
    employerDetails: {
      name: string;
      jobGroup?: string | null;
    };
  };
  beneficiaryOf?: Array<Beneficiary>;
}

export interface Beneficiary {
  idNumber: string;
  idType: string;
  crNumber: string;
  name: string;
  relationship: string;
}

export const SCHEME_IDS = {
  UHC: 1,
  SHIF: 2,
  TSC: 3,
  POMSF: 4,
} as const;

export const SCHEME_NAMES = {
  1: 'UHC',
  2: 'SHIF',
  3: 'TSC',
  4: 'POMSF',
} as const;

export const useSHAEligibility = (patientUuid: string) => {
  const { patient } = usePatient(patientUuid);
  const { nationalIdUUID } = useConfig<BillingConfig>();

  const nationalId = patient?.identifier?.find((id) =>
    id?.type?.coding?.some((c) => c?.code === nationalIdUUID),
  )?.value;

  const url = nationalId
    ? `${virtualClaimBaseUrl}/eligibility?identification_number=${encodeURIComponent(
        nationalId,
      )}&identification_type=${encodeURIComponent('National ID')}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{ data: EligibilityResponse }>(url, openmrsFetch, {
    errorRetryCount: 0,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  return {
    data: data?.data,
    isPatientWhiteListed: data?.data?.whitelistedForOTP ?? false,
    facilityBiometricsEnforced: data?.data?.facilityBiometricsEnforced ?? false,
    isLoading,
    error,
    mutate,
  };
};
