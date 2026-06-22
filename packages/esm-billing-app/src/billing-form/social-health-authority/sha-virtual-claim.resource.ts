import { openmrsFetch, restBaseUrl, type FetchResponse, useOpenmrsPagination, useConfig } from '@openmrs/esm-framework';
import useSWR from 'swr';
import {
  AuthorizingDeviceOS,
  BatchLinesResponse,
  BiometricAuthorizationStatus,
  BiometricAuthorizeRequest,
  BiometricAuthorizeResponse,
  BiometricConfigResponse,
  ElectiveCheckinRecord,
  NonPomsfUtilizationResponse,
  OTPResponse,
  PreauthQueueItem,
  ProviderAttributesResponse,
  SHAIntervention,
  SHASubBenefit,
  VirtualClaimResponse,
  WhitelistReason,
  WhitelistStatusPoll,
  WhitelistSubmitResponse,
} from './type';
import { virtualClaimBaseUrl } from '../../claims/claims-management/table/virtual-claim-preauth/constants';
import { BillingConfig } from '../../config-schema';
import { TFunction } from 'i18next';
import {
  extractFetchError,
  extractUpstreamError,
} from '../../claims/claims-management/table/virtual-claim-preauth/utils';

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
  authParams: { otp: string } | { authGuid: string },
  serviceType: string,
  interventionCodes: string[],
  visitUuid: string,
  patientUuid: string,
  paymentMechanism?: string,
  electiveAuthorizationCode?: string,
): Promise<VirtualClaimResponse> {
  const body: Record<string, any> = {
    patient_id: patientCRId,
    service_type: serviceType,
    intervention_codes: interventionCodes,
    visit_uuid: visitUuid,
    patient_uuid: patientUuid,
  };

  if ('otp' in authParams) {
    body.otp = authParams.otp;
    body.is_biometrics = false;
  } else {
    body.auth_guid = authParams.authGuid;
    body.is_biometrics = true;
  }

  if (paymentMechanism) {
    body.payment_mechanism = paymentMechanism;
  }

  if (electiveAuthorizationCode) {
    body.elective_authorization_code = electiveAuthorizationCode;
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
  applicableDocumentTypes: Array<string> = [],
  preauthType: string = '',
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
      applicable_document_types: applicableDocumentTypes,
      preauth_type: preauthType,
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
  const customRepresentation = 'custom:(person:(display),attributes:(attributeType:(uuid,display),value))';
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

export const useOtpWhitelistReasons = () => {
  const url = `${virtualClaimBaseUrl}/otp-whitelist-reasons`;
  const { data, error, isLoading } = useSWR<FetchResponse<{ count: number; reasons: Array<WhitelistReason> }>>(
    url,
    openmrsFetch,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60_000 },
  );
  return {
    reasons: data?.data?.reasons ?? [],
    isLoading,
    error,
  };
};

export const fetchWhitelistStatus = async (
  beneficiaryCrId: string,
  options?: { force?: boolean },
): Promise<WhitelistStatusPoll> => {
  const buster = options?.force ? `&_=${Date.now()}` : '';
  const url = `${virtualClaimBaseUrl}/otp-whitelist-status?beneficiary_cr_id=${encodeURIComponent(
    beneficiaryCrId,
  )}${buster}`;
  const response = await openmrsFetch(url);
  return response.data;
};

export const submitOtpWhitelist = async (params: {
  beneficiaryCrId: string;
  reasonType: string;
  reason: string;
  biometricAttempts: number;
  attachment?: File;
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

export const checkBiometricAuthorizationStatus = async (token: string): Promise<BiometricAuthorizationStatus> => {
  const response = await openmrsFetch<BiometricAuthorizationStatus>(
    `${virtualClaimBaseUrl}/biometric-authorization-status?token=${encodeURIComponent(token)}`,
  );
  return response.data;
};

export const rejectBiometricAuthorization = async (
  token: string,
  reason?: string,
): Promise<{ success: boolean; message?: string; error?: string }> => {
  const response = await openmrsFetch(`${virtualClaimBaseUrl}/biometric-reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { token, ...(reason ? { reason } : {}) },
  });
  return response.data;
};

export const addVisitAttribute = async (
  visitUuid: string,
  attributeTypeUuid: string,
  value: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    await openmrsFetch(`${restBaseUrl}/visit/${visitUuid}/attribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attributeType: attributeTypeUuid,
        value,
      }),
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to add visit attribute:', error);
    return { success: false, error: 'Failed to add visit attribute' };
  }
};

export const useNonPomsfUtilization = (patientCRId: string, interventionCode: string) => {
  const shouldFetch = Boolean(patientCRId && interventionCode);
  const url = shouldFetch
    ? `${restBaseUrl}/virtualclaims/non-pomsf-utilization?patient_id=${encodeURIComponent(
        patientCRId!,
      )}&intervention_code=${encodeURIComponent(interventionCode!)}`
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<FetchResponse<NonPomsfUtilizationResponse>>(
    url,
    openmrsFetch,
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    },
  );

  return {
    utilization: data?.data ?? null,
    isLoading,
    isValidating,
    error,
    mutate,
  };
};

export const addInterventionToVisit = async (
  consentToken: string,
  interventionCode: string,
  newInterventionPayload?: any,
): Promise<{ success: boolean; error?: string; message?: string }> => {
  const body: Record<string, any> = {
    consent_token: consentToken,
    intervention_code: interventionCode,
  };
  if (newInterventionPayload) {
    body.new_intervention_payload = newInterventionPayload;
  }
  const response = await openmrsFetch(`${virtualClaimBaseUrl}/interventions/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return response.data;
};

export const switchInterventionOnVisit = async (
  authorizationCode: string,
  fromInterventionCode: string,
  toInterventionCode: string,
  retainBillItems: boolean = true,
  newInterventionPayload?: any,
): Promise<any> => {
  const url = `${virtualClaimBaseUrl}/interventions/switch`;

  const body: Record<string, any> = {
    consent_token: authorizationCode,
    existing_intervention_code: fromInterventionCode,
    new_intervention_code: toInterventionCode,
    retain_bill_items: retainBillItems,
  };
  if (newInterventionPayload) {
    body.new_intervention_payload = newInterventionPayload;
  }

  const response = await openmrsFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response?.data ?? response;
};

export const restoreInterventionOnVisit = async (authorizationCode: string, interventionCode: string) => {
  const payload = {
    consent_token: authorizationCode,
    intervention_code: interventionCode,
  };
  const url = `${restBaseUrl}/virtualclaims/interventions/restore`;
  const response = await openmrsFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  return response?.data;
};

export const dispatchClaimLinesToSha = async (
  authorizationCode: string,
  intervention: { code: string; isPerDiem: boolean; paymentMechanism: string | null },
  lineItems: Array<{ uuid: string; price: number; quantity?: number }>,
  t: TFunction,
): Promise<{ ok: boolean; error?: string; response?: BatchLinesResponse }> => {
  if (!authorizationCode) {
    return { ok: false, error: t('noAuthorizationCode', 'No SHA authorization code available for this visit') };
  }

  const lines = lineItems.map((item) => ({
    intervention_code: intervention.code,
    ...(intervention.isPerDiem && { payment_mechanism: intervention.paymentMechanism }),
    unit_price: String(item.price),
    quantity: String(item.quantity ?? 1),
    openmrs_line_item_uuid: item.uuid,
  }));

  const body = { consent_token: authorizationCode, lines };

  try {
    const response = await openmrsFetch(`${restBaseUrl}/virtualclaims/billing/lines/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: t('batchLinesHttpError', 'SHA batch call failed (HTTP {{status}})', { status: response.status }),
      };
    }

    const data = response.data as BatchLinesResponse;
    const settled = (data.succeeded ?? 0) + (data.skipped ?? 0);
    if (settled === data.total) {
      return { ok: true, response: data };
    }

    const failure = (data.results ?? []).find((r) => r.success === false);
    if (failure) {
      const payload = {
        error: failure.error,
        upstream_error: failure.upstream_error,
        message: failure.reason,
      };
      const failureMsg = extractUpstreamError(
        payload as any,
        t('batchLinesPartialFailure', '{{failed}} of {{total}} lines failed', {
          failed: data.failed,
          total: data.total,
        }),
      );
      return { ok: false, error: failureMsg, response: data };
    }
    return {
      ok: false,
      error: t('batchLinesPartialFailure', '{{failed}} of {{total}} lines failed', {
        failed: data.failed,
        total: data.total,
      }),
      response: data,
    };
  } catch (err) {
    const networkFallback =
      err instanceof Error ? err.message : typeof err === 'string' ? err : t('unknownError', 'Unknown error');
    return {
      ok: false,
      error: extractFetchError(
        err,
        t('batchLinesNetworkError', 'Could not reach SHA: {{message}}', { message: networkFallback }),
      ),
    };
  }
};
