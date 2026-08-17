import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { extractFetchError, extractUpstreamError } from '../../../claims-management/table/virtual-claim-preauth/utils';
import { TFunction } from 'i18next';
import useSWR from 'swr';

export type ClaimPreviewSHAIntervention = {
  intervention_code?: string;
  intervention_name?: string;
  intervention_payment_mechanism?: string;
  keph_level_tarrif?: string | number;
  accrued_per_diem_amount?: string | number;
  accrued_per_diem_days?: number;
};

export type ClaimPreviewSHAInvoice = {
  invoice_number?: string;
  total_amount?: string | number;
  net_amount?: string | number;
  total_inv_amount?: string | number;
  total_inv_net_amount?: string | number;
};

export type ClaimPreviewResponse = {
  success: boolean;
  consent_token: string;
  ready_to_dispatch: boolean;
  local?: {
    summary?: Record<string, number | boolean>;
    workflow_state?: string;
  };
  sha?: {
    workflow_state?: string;
    invoices?: Array<ClaimPreviewSHAInvoice>;
    interventions?: Array<ClaimPreviewSHAIntervention>;
    [key: string]: unknown;
  };
  sha_error?: string;
};

export const usePreviewClaim = (consentToken?: string) => {
  const url = consentToken
    ? `${restBaseUrl}/virtualclaims/billing/preview-claim?consent_token=${encodeURIComponent(consentToken)}`
    : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<FetchResponse<ClaimPreviewResponse>>(
    url,
    openmrsFetch,
    {
      revalidateOnFocus: false,
      // The claim can still be processing server-side right after creation, so a preview fetched
      // immediately afterwards may come back incomplete (or briefly error). Retry transient errors,
      // and keep polling — using the backend's own readiness flag — until ready_to_dispatch is true.
      errorRetryCount: 5,
      errorRetryInterval: 2000,
      refreshInterval: (latestData) => (latestData && !latestData.data?.ready_to_dispatch ? 2000 : 0),
    },
  );
  return {
    preview: data?.data ?? null,
    isLoading,
    isValidating,
    error,
    mutate,
  };
};

export type DischargeReasonOption = {
  code: string;
  label: string;
  description: string;
};

export type DischargeReasonsResponse = {
  count: number;
  discharge_reasons: Array<DischargeReasonOption>;
};

export const useDischargeReasons = () => {
  const url = `${restBaseUrl}/virtualclaims/billing/discharge-reasons`;
  const { data, error, isLoading } = useSWR<FetchResponse<DischargeReasonsResponse>>(url, openmrsFetch);
  return {
    reasons: data?.data?.discharge_reasons ?? [],
    isLoading,
    error,
  };
};

export type CloseReasonOption = {
  code: string;
  label: string;
  description: string;
};

export type CloseReasonsResponse = {
  count: number;
  reasons: Array<CloseReasonOption>;
};

export const useCloseReasons = () => {
  const url = `${restBaseUrl}/virtualclaims/billing/close-reasons`;
  const { data, error, isLoading } = useSWR<FetchResponse<CloseReasonsResponse>>(url, openmrsFetch);
  return {
    reasons: data?.data?.reasons ?? [],
    isLoading,
    error,
  };
};

export const requestDischargeOtp = async (
  consentToken: string,
  patientId: string,
  t: TFunction,
): Promise<{ success: boolean; error?: string }> => {
  if (!consentToken) {
    return { success: false, error: t('noConsentToken', 'No consent token provided') };
  }
  if (!patientId) {
    return { success: false, error: t('noPatientCRId', 'Patient has no SHA CR number') };
  }

  try {
    const response = await openmrsFetch(`${restBaseUrl}/virtualclaims/billing/otp/discharge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent_token: consentToken, patient_id: patientId }),
    });
    const data = response.data as { success: boolean; upstream_error?: unknown; error?: string };

    if (!response.ok || data.success === false) {
      const fallback = data.error ?? t('otpRequestFailed', 'Failed to send OTP');
      const errMsg = data.upstream_error
        ? extractUpstreamError({ error: data.error, upstream_error: data.upstream_error } as any, fallback)
        : fallback;
      return { success: false, error: errMsg };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: extractFetchError(err, t('otpRequestNetworkError', 'Could not request OTP')),
    };
  }
};

export type SubmitClaimParams = {
  consentToken: string;
  invoiceNumber: string;
  otp?: string;
  dischargeAuthGuid?: string;
  dischargeReason: string;
  skipAuthCheck?: boolean;
  isEmergency?: boolean;
  reasonForUnknownPatient?: string;
};

export const submitClaim = async (
  params: SubmitClaimParams,
  t: TFunction,
): Promise<{ ok: boolean; error?: string; mirrored?: boolean }> => {
  if (!params.consentToken) {
    return { ok: false, error: t('noConsentToken', 'No consent token provided') };
  }
  if (!params.invoiceNumber) {
    return { ok: false, error: t('noInvoiceNumber', 'No invoice number on claim') };
  }
  const body: Record<string, string> = {
    consent_token: params.consentToken,
    invoice_number: params.invoiceNumber,
  };

  if (params.isEmergency) {
    // Emergency claims are authorised by doctor consent, not OTP/biometrics, but SHA still
    // requires a discharge reason. An unidentified patient additionally supplies a reason.
    if (!params.dischargeReason) {
      return { ok: false, error: t('dischargeReasonRequired', 'Discharge reason is required') };
    }
    body.discharge_reason = params.dischargeReason;
    if (params.reasonForUnknownPatient) {
      body.reason_for_unknown_patient = params.reasonForUnknownPatient;
    }
  } else {
    if (!params.skipAuthCheck && !params.dischargeReason) {
      return { ok: false, error: t('dischargeReasonRequired', 'Discharge reason is required') };
    }
    if (!params.skipAuthCheck && !params.otp && !params.dischargeAuthGuid) {
      return {
        ok: false,
        error: t('authRequired', 'Either OTP or biometric authorization is required'),
      };
    }
    body.discharge_reason = params.dischargeReason;
    if (params.otp) {
      body.otp = params.otp;
    }
    if (params.dischargeAuthGuid) {
      body.discharge_auth_guid = params.dischargeAuthGuid;
    }
  }

  try {
    const response = await openmrsFetch(`${restBaseUrl}/virtualclaims/billing/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = response.data as {
      success: boolean;
      mirrored?: boolean;
      upstream_error?: unknown;
      error?: string;
    };

    if (!response.ok || data.success === false) {
      const fallback = data.error ?? t('submitFailed', 'Submit failed');
      const errMsg = data.upstream_error
        ? extractUpstreamError({ error: data.error, upstream_error: data.upstream_error } as any, fallback)
        : fallback;
      return { ok: false, error: errMsg };
    }
    return { ok: true, mirrored: data.mirrored === true };
  } catch (err) {
    return {
      ok: false,
      error: extractFetchError(err, t('submitNetworkError', 'Could not submit claim')),
    };
  }
};

export type DischargeClaimParams = SubmitClaimParams & {
  dischargeDate: string;
};

export const dischargeClaim = async (
  params: DischargeClaimParams,
  t: TFunction,
): Promise<{ ok: boolean; error?: string; mirrored?: boolean }> => {
  if (!params.dischargeDate) {
    return { ok: false, error: t('dischargeDateRequired', 'Discharge date is required for inpatient claims') };
  }

  if (!params.consentToken || !params.invoiceNumber) {
    return { ok: false, error: t('missingRequiredFields', 'Missing required fields') };
  }
  if (!params.skipAuthCheck && !params.dischargeReason) {
    return { ok: false, error: t('dischargeReasonRequired', 'Discharge reason is required') };
  }
  if (!params.skipAuthCheck && !params.otp && !params.dischargeAuthGuid) {
    return {
      ok: false,
      error: t('authRequired', 'Either OTP or biometric authorization is required'),
    };
  }

  const body: Record<string, string> = {
    consent_token: params.consentToken,
    invoice_number: params.invoiceNumber,
    discharge_reason: params.dischargeReason,
    discharge_date: params.dischargeDate,
  };
  if (params.otp) {
    body.otp = params.otp;
  }
  if (params.dischargeAuthGuid) {
    body.discharge_auth_guid = params.dischargeAuthGuid;
  }

  try {
    const response = await openmrsFetch(`${restBaseUrl}/virtualclaims/billing/discharge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = response.data as {
      success: boolean;
      mirrored?: boolean;
      upstream_error?: unknown;
      error?: string;
    };

    if (!response.ok || data.success === false) {
      const fallback = data.error ?? t('dischargeFailed', 'Discharge failed');
      const errMsg = data.upstream_error
        ? extractUpstreamError({ error: data.error, upstream_error: data.upstream_error } as any, fallback)
        : fallback;
      return { ok: false, error: errMsg };
    }
    return { ok: true, mirrored: data.mirrored === true };
  } catch (err) {
    return {
      ok: false,
      error: extractFetchError(err, t('dischargeNetworkError', 'Could not discharge claim')),
    };
  }
};
