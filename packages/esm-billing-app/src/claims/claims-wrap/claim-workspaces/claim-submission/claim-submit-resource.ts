import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { extractFetchError, extractUpstreamError } from '../../../claims-management/table/virtual-claim-preauth/utils';
import { TFunction } from 'i18next';
import useSWR from 'swr';

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
  };
  if (params.otp) {
    body.otp = params.otp;
  }
  if (params.dischargeAuthGuid) {
    body.discharge_auth_guid = params.dischargeAuthGuid;
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
