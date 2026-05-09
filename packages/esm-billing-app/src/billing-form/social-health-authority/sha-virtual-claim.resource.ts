import { openmrsFetch, restBaseUrl, type FetchResponse, useOpenmrsPagination, useConfig } from '@openmrs/esm-framework';
import useSWR from 'swr';
import {
  AuthorizingDeviceOS,
  BiometricAuthorizeRequest,
  BiometricAuthorizeResponse,
  BiometricConfigResponse,
  ElectiveCheckinRecord,
  OTPResponse,
  PreauthQueueItem,
  ProviderAttributesResponse,
  SHAIntervention,
  SHASubBenefit,
  VirtualClaimResponse,
} from './type';
import { virtualClaimBaseUrl } from '../../claims/claims-management/table/virtual-claim-preauth/constants';
import { BillingConfig } from '../../config-schema';

export const useSHASubBenefits = (patientCRId: string) => {
  const url = patientCRId ? `${virtualClaimBaseUrl}/sub-benefits?patient_id=${patientCRId}` : null;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ count: number; results: Array<SHASubBenefit> }>>(
    url,
    openmrsFetch,
  );
  return { subBenefits: data?.data?.results ?? [], count: data?.data?.count ?? 0, isLoading, error, mutate };
};

export const useSHAInterventions = (patientCRId: string, subBenefitCode: string) => {
  const url =
    patientCRId && subBenefitCode
      ? `${virtualClaimBaseUrl}/interventions?patient_id=${patientCRId}&sub_benefit_code=${subBenefitCode}`
      : null;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ count: number; results: Array<SHAIntervention> }>>(
    url,
    openmrsFetch,
  );
  return { interventions: data?.data?.results ?? [], count: data?.data?.count ?? 0, isLoading, error, mutate };
};

export const usePreauthQueue = (
  tab: 'ALL' | 'PENDING' | 'COMPLETED' | 'REJECTED' | 'SCHEDULED' = 'ALL',
  pageSize: number = 20,
  fromDate?: string,
  toDate?: string,
) => {
  let url = `${virtualClaimBaseUrl}/preauth-queue?tab=${tab}`;
  if (fromDate) {
    url += `&from_date=${fromDate}`;
  }
  if (toDate) {
    url += `&to_date=${toDate}`;
  }

  const result = useOpenmrsPagination<PreauthQueueItem>(url, pageSize, {
    swrConfig: { refreshInterval: 60_000, revalidateOnFocus: false, dedupingInterval: 30_000 },
  });

  return {
    queue: result.data ?? [],
    count: result.totalCount,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    paginated: result.paginated,
    showNextButton: result.showNextButton,
    showPreviousButton: result.showPreviousButton,
    goTo: result.goTo,
    goToNext: result.goToNext,
    goToPrevious: result.goToPrevious,
    isLoading: result.isLoading,
    error: result.error,
    mutate: result.mutate,
  };
};

export const useElectiveCheckin = (authorizationCode: string | null) => {
  const url =
    authorizationCode && authorizationCode.trim().length >= 6
      ? `${virtualClaimBaseUrl}/elective-checkin?authorization_code=${authorizationCode.trim()}`
      : null;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<ElectiveCheckinRecord>>(url, openmrsFetch);
  const record = data?.data ?? null;
  const isAlreadyUsed =
    error?.response?.status === 409 ||
    (record as any)?.already_used === true ||
    (record !== null && record.workflow_state != null && !record.workflow_state.startsWith('ELECTIVE'));
  return {
    electiveRecord: isAlreadyUsed ? null : record,
    isLoading,
    error,
    isApproved: !isAlreadyUsed && record?.workflow_state === 'ELECTIVE_APPROVED',
    isAlreadyUsed,
    mutate,
  };
};

export const sendSHAOtp = async (patientCRId: string, interventionCodes: string[]): Promise<OTPResponse> => {
  const response = await openmrsFetch(`${virtualClaimBaseUrl}/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { patient_id: patientCRId, intervention_codes: interventionCodes },
  });
  return response.data;
};
export async function createSHAVirtualClaim(
  patientCRId: string,
  otp: string,
  serviceType: string,
  interventionCodes: string[],
  visitUuid: string,
  patientUuid: string,
  inpatientFields?: {
    admission_date?: string;
    estimated_days_of_admission?: number;
  },
  paymentMechanism?: string,
): Promise<VirtualClaimResponse> {
  const body: Record<string, any> = {
    patient_id: patientCRId,
    otp,
    service_type: serviceType,
    intervention_codes: interventionCodes,
    visit_uuid: visitUuid,
    patient_uuid: patientUuid,
  };

  if (paymentMechanism) {
    body.payment_mechanism = paymentMechanism;
  }

  if (serviceType === 'INPATIENT' && inpatientFields) {
    if (inpatientFields.admission_date) {
      body.admission_date = inpatientFields.admission_date;
    }
    if (inpatientFields.estimated_days_of_admission != null) {
      body.estimated_days_of_admission = inpatientFields.estimated_days_of_admission;
    }
  }

  const response = await openmrsFetch(`${virtualClaimBaseUrl}/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return response.data;
}

export const usePatientPhone = (patientUuid: string) => {
  const { data } = useSWR<{
    data: { person: { attributes: Array<{ attributeType: { display: string }; value: string }> } };
  }>(
    patientUuid
      ? `${restBaseUrl}/patient/${patientUuid}?v=custom:(person:(attributes:(attributeType:(display),value)))`
      : null,
    openmrsFetch,
  );
  return (
    data?.data?.person?.attributes?.find(
      (attr) =>
        attr.attributeType?.display?.toLowerCase().includes('phone') ||
        attr.attributeType?.display?.toLowerCase().includes('telephone'),
    )?.value ?? ''
  );
};

export const createElectiveAuthorization = async (
  patientCRId: string,
  otp: string,
  interventionCode: string,
  patientUuid: string,
  serviceType: string = 'OUTPATIENT',
  interventionName: string = '',
  interventionTariff: string = '',
): Promise<{
  success: boolean;
  authorization_code?: string;
  consent_token?: string;
  error?: string;
  upstream_error?: { error?: string; message?: string };
}> => {
  const response = await openmrsFetch(`${virtualClaimBaseUrl}/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      patient_id: patientCRId,
      otp,
      service_type: serviceType,
      intervention_codes: [interventionCode],
      intervention_name: interventionName,
      intervention_tariff: interventionTariff,
      patient_uuid: patientUuid,
    },
  });
  return response.data;
};

export const linkVisitToClaim = async (
  authorizationCode: string,
  visitUuid: string,
  patientUuid: string,
): Promise<{ success: boolean; error?: string }> => {
  const response = await openmrsFetch(`${virtualClaimBaseUrl}/link-visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { authorization_code: authorizationCode, visit_uuid: visitUuid, patient_uuid: patientUuid },
  });
  return response.data;
};

export const createSHABiometricAuthorize = async (
  payload: BiometricAuthorizeRequest,
): Promise<BiometricAuthorizeResponse> => {
  const response = await openmrsFetch(`${virtualClaimBaseUrl}/biometric-authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  return response.data;
};

export const useBiometricConfig = () => {
  const url = `${virtualClaimBaseUrl}/biometric-config`;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<BiometricConfigResponse>>(url, openmrsFetch);
  return {
    agentUrl: data?.data?.agent_url,
    agentTimeoutMs: data?.data?.agent_timeout_ms,
    defaultFactors: data?.data?.default_factors,
    isLoading,
    error,
    mutate,
  };
};
export const useProviderNationalId = (uuid: string) => {
  const customRepresentation = 'custom:(person:(display),attributes:(attributeType:(display),value))';
  const url = `${restBaseUrl}/provider/${uuid}?v=${customRepresentation}`;
  const { providerNationalIdUuid } = useConfig<BillingConfig>();

  const { isLoading, error, data } = useSWR<FetchResponse<ProviderAttributesResponse>>(url, openmrsFetch);

  const providerNationalid = data?.data?.attributes?.find(
    (attr) => attr.attributeType.uuid === providerNationalIdUuid,
  )?.value;
  return { isLoading, error, providerNationalid };
};

export interface BiometricAgentStatus {
  devices: any[];
  card_readers: any[];
  isAuthed: boolean;
  workstationID: string;
  version: string;
}

export const useBiometricAgentStatus = (agentUrl: string | undefined) => {
  const { data, error, isLoading, mutate } = useSWR<BiometricAgentStatus>(
    agentUrl ?? null,
    async (url: string) => {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Biometric agent returned ${res.status}`);
      }
      return res.json();
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      dedupingInterval: 30_000,
    },
  );

  return {
    workstationId: data?.workstationID,
    isAuthed: data?.isAuthed ?? false,
    agentVersion: data?.version,
    devices: data?.devices ?? [],
    cardReaders: data?.card_readers ?? [],
    isLoading,
    error,
    mutate,
  };
};

export const detectAuthorizingDeviceOS = (): AuthorizingDeviceOS => {
  if (typeof navigator === 'undefined') {
    return 'windows';
  }

  const uaDataPlatform = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData?.platform?.toLowerCase();

  if (uaDataPlatform) {
    if (uaDataPlatform.includes('android')) {
      return 'android';
    }
    if (uaDataPlatform.includes('windows')) {
      return 'windows';
    }
  }

  const userAgent = navigator.userAgent?.toLowerCase() ?? '';

  if (userAgent.includes('android')) {
    return 'android';
  }
  if (userAgent.includes('windows')) {
    return 'windows';
  }

  return 'windows';
};
