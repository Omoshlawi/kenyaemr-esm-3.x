import { openmrsFetch, restBaseUrl, useConfig, usePatient, type FetchResponse } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { type ExpressWorkflowConfig } from '../../../config-schema';
import {
  AuthorizingDeviceOS,
  BiometricAuthorizationStatus,
  BiometricAuthorizeRequest,
  BiometricAuthorizeResponse,
  BiometricConfigResponse,
  OTPResponse,
  ProviderAttributesResponse,
  WhitelistReason,
  WhitelistStatusPoll,
  WhitelistSubmitResponse,
} from '../type';

const virtualClaimBaseUrl = `${restBaseUrl}/virtualclaims`;

export const usePatientPhone = (patientUuid: string): string => {
  const { data } = useSWR<
    FetchResponse<{ person: { attributes: Array<{ attributeType: { display: string }; value: string }> } }>
  >(
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

export const usePatientCRId = (patientUuid: string): string | null => {
  const { crIdentificationNumberUUID } = useConfig<ExpressWorkflowConfig>();
  const { data } = useSWR<
    FetchResponse<{ identifiers: Array<{ identifierType: { uuid: string }; identifier: string }> }>
  >(
    patientUuid
      ? `${restBaseUrl}/patient/${patientUuid}?v=custom:(identifiers:(identifierType:(uuid),identifier))`
      : null,
    openmrsFetch,
  );
  return (
    data?.data?.identifiers?.find((id) => id.identifierType?.uuid === crIdentificationNumberUUID)?.identifier ?? null
  );
};

export interface EligibilityResponse {
  requestIdType: number;
  requestIdNumber: string;
  memberCrNumber: string;
  whitelistedForOTP: boolean;
  fullName: string;
  statusCode: string;
  statusDesc: string;
  schemes: Array<any>;
  dateOfBirth?: string;
  gender?: string;
  age?: number;
}

export const useSHAEligibility = (patientUuid: string) => {
  const { patient } = usePatient(patientUuid);
  const { nationalIdUUID } = useConfig<ExpressWorkflowConfig>();

  const nationalId = patient?.identifier?.find((id: any) =>
    id?.type?.coding?.some((c: any) => c?.code === nationalIdUUID),
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
    isLoading,
    error,
    mutate,
  };
};

export const useProviderNationalId = (providerUuid: string) => {
  const { providerNationalIdUuid } = useConfig<ExpressWorkflowConfig>();
  const customRep = 'custom:(attributes:(attributeType:(uuid,display),value))';
  const url = providerUuid ? `${restBaseUrl}/provider/${providerUuid}?v=${customRep}` : null;
  const { data, isLoading, error } = useSWR<FetchResponse<ProviderAttributesResponse>>(url, openmrsFetch);
  const providerNationalid = data?.data?.attributes?.find(
    (attr) => attr.attributeType.uuid === providerNationalIdUuid,
  )?.value;
  return { providerNationalid, isLoading, error };
};

export const useBiometricConfig = () => {
  const { data, error, isLoading } = useSWR<FetchResponse<BiometricConfigResponse>>(
    `${virtualClaimBaseUrl}/biometric-config`,
    openmrsFetch,
  );
  return {
    agentUrl: data?.data?.agent_url,
    agentTimeoutMs: data?.data?.agent_timeout_ms,
    isLoading,
    error,
  };
};

export interface BiometricAgentStatus {
  devices: any[];
  card_readers: any[];
  isAuthed: boolean;
  workstationID: string;
  version: string;
}

export const useBiometricAgentStatus = (agentUrl: string | undefined) => {
  const { data, error, isLoading } = useSWR<BiometricAgentStatus>(
    agentUrl ?? null,
    async (url: string) => {
      const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
      if (!res.ok) {
        throw new Error(`Biometric agent returned ${res.status}`);
      }
      return res.json();
    },
    { revalidateOnFocus: false, shouldRetryOnError: false, dedupingInterval: 30_000 },
  );
  return {
    workstationId: data?.workstationID,
    isAuthed: data?.isAuthed ?? false,
    isLoading,
    error,
  };
};

export const useOtpWhitelistReasons = () => {
  const { data, isLoading, error } = useSWR<FetchResponse<{ count: number; reasons: Array<WhitelistReason> }>>(
    `${virtualClaimBaseUrl}/otp-whitelist-reasons`,
    openmrsFetch,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5 * 60_000,
    },
  );
  return { reasons: data?.data?.reasons ?? [], isLoading, error };
};

export const detectAuthorizingDeviceOS = (): AuthorizingDeviceOS => {
  if (typeof navigator === 'undefined') {
    return 'windows';
  }
  const uaDataPlatform = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData?.platform?.toLowerCase();
  if (uaDataPlatform?.includes('android')) {
    return 'android';
  }
  if (uaDataPlatform?.includes('windows')) {
    return 'windows';
  }
  const userAgent = navigator.userAgent?.toLowerCase() ?? '';
  if (userAgent.includes('android')) {
    return 'android';
  }
  return 'windows';
};

export const sendSHAOtp = async (
  patientCRId: string,
  options: string[] | { consentToken: string },
): Promise<OTPResponse> => {
  const body = Array.isArray(options)
    ? { patient_id: patientCRId, intervention_codes: options }
    : { patient_id: patientCRId, consent_token: options.consentToken };

  const response = await openmrsFetch(`${virtualClaimBaseUrl}/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
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

export const checkBiometricAuthorizationStatus = async (token: string): Promise<BiometricAuthorizationStatus> => {
  const response = await openmrsFetch<BiometricAuthorizationStatus>(
    `${virtualClaimBaseUrl}/biometric-authorization-status?token=${encodeURIComponent(token)}`,
  );
  return response.data;
};

export const rejectBiometricAuthorization = async (
  token: string,
): Promise<{ success: boolean; message?: string; error?: string }> => {
  const response = await openmrsFetch(`${virtualClaimBaseUrl}/biometric-reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { token },
  });
  return response.data;
};

export const fetchWhitelistStatus = async (beneficiaryCrId: string): Promise<WhitelistStatusPoll> => {
  const response = await openmrsFetch(
    `${virtualClaimBaseUrl}/otp-whitelist-status?beneficiary_cr_id=${encodeURIComponent(beneficiaryCrId)}`,
  );
  return response.data;
};

/**
 * Submits a visit insurance claim and ends the visit in a single call.
 * Call this after obtaining OTP or biometric authorisation.
 *
 * @param visitUuid        - UUID of the active visit to end.
 * @param otp              - OTP supplied by the patient (optional — omit when using biometric auth).
 * @param dischargeReason  - Discharge reason code (e.g. RECOVERED, REFERRED, ABSCONDED, OTHER).
 * @param dischargeAuthGuid - GUID returned by the biometric authorisation flow (optional — omit when using OTP).
 */
export const submitVisitClaim = async (params: {
  visitUuid: string;
  otp?: string;
  dischargeReason?: string;
  dischargeAuthGuid?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> => {
  const query = new URLSearchParams({ visitUuid: params.visitUuid });
  if (params.otp) {
    query.set('otp', params.otp);
  }
  if (params.dischargeReason) {
    query.set('dischargeReason', params.dischargeReason);
  }
  if (params.dischargeAuthGuid) {
    query.set('dischargeAuthGuid', params.dischargeAuthGuid);
  }
  const response = await openmrsFetch(`${restBaseUrl}/insuranceclaims/phc/submitVisit?${query.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

export const submitOtpWhitelist = async (params: {
  beneficiaryCrId: string;
  reasonType: string;
  reason: string;
  biometricAttempts: number;
  attachment: File | null;
}): Promise<WhitelistSubmitResponse> => {
  const formData = new FormData();
  formData.append('beneficiary_cr_id', params.beneficiaryCrId);
  formData.append('reason_type', params.reasonType);
  formData.append('reason', params.reason);
  formData.append('biometric_attempts', String(params.biometricAttempts));
  if (params.attachment && params.attachment.size > 0) {
    formData.append('attachment', params.attachment, params.attachment.name);
  }
  const response = await openmrsFetch(`${virtualClaimBaseUrl}/otp-whitelists`, {
    method: 'POST',
    body: formData,
  });
  return response.data;
};
