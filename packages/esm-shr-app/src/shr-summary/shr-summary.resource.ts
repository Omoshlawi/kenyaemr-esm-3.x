import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import type { SHRSummary } from '../types';

export type ShrVisitType = 'OP' | 'IP';

export interface ShrConsent {
  status?: string;
  consentId: string | null;
  consentStatus: string | null;
  visitId: string | null;
  visitType: string | null;
  requestedBy: string | null;
  expiryDate: string | null;
  closedDate: string | null;
  emergency: boolean;
  incapacityReason?: string | null;
  representativeRelationship?: string | null;
  practitionerUuid?: string | null;
  consentGranted: boolean;
}

interface ShrConsentResponse {
  status: string;
  hasConsent: boolean;
  consent: ShrConsent | null;
}

export interface RequestShrConsentPayload {
  patientUuid: string;
  practitionerUuid: string;
  visitType?: ShrVisitType;
  requestedBy?: string;
  emergency?: boolean;
  incapacityReason?: string;
  representativeRelationship?: string;
}

/**
 * Checks whether the patient already has a usable SHR consent on file. `hasConsent` is true only
 * when the server holds an open, non-voided consent whose token is still valid, so the SHR data can
 * be gated on it; the `consent` detail is returned when one exists (open or not) for context.
 */
export const useShrConsent = (patientUuid: string) => {
  const url = patientUuid ? `${restBaseUrl}/kenyaemril/shr-consent?patientUuid=${patientUuid}` : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: ShrConsentResponse }>(url, openmrsFetch);

  return {
    hasConsent: data?.data?.hasConsent ?? false,
    consent: data?.data?.consent ?? null,
    isLoading,
    isValidating,
    error,
    mutate,
  };
};

/**
 * Starts an SHR visit consent. Ordinarily the SHR sends the patient an OTP and returns a pending
 * consent; an emergency request is granted immediately with a usable visit and consent token.
 */
export const requestShrConsent = async (payload: RequestShrConsentPayload) => {
  const response = await openmrsFetch<ShrConsent>(`${restBaseUrl}/kenyaemril/shr-consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      patientUuid: payload.patientUuid,
      practitionerUuid: payload.practitionerUuid,
      visitType: payload.visitType ?? 'OP',
      requestedBy: payload.requestedBy,
      emergency: payload.emergency ? 'true' : 'false',
      incapacityReason: payload.incapacityReason,
      representativeRelationship: payload.representativeRelationship,
    },
  });
  return response.data;
};

/** Exchanges the OTP the patient received for a consent token and opens the SHR visit. */
export const verifyShrConsentOtp = async (consentId: string, otp: string) => {
  const response = await openmrsFetch<ShrConsent>(`${restBaseUrl}/kenyaemril/shr-consent/${consentId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { otp },
  });
  return response.data;
};

/** Asks the SHR to send a fresh OTP for an existing pending consent. */
export const resendShrConsentOtp = async (consentId: string) => {
  const response = await openmrsFetch<ShrConsent>(`${restBaseUrl}/kenyaemril/shr-consent/${consentId}/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

/**
 * Renews the consent token of an open SHR visit, extending how long the patient's records can be
 * read without raising a fresh consent (and a new OTP).
 */
export const refreshShrVisit = async (visitId: string) => {
  const response = await openmrsFetch<ShrConsent>(`${restBaseUrl}/kenyaemril/shr-visit/${visitId}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

/** Closes the SHR visit; the consent token stops being usable and a new visit needs a new OTP. */
export const closeShrVisit = async (visitId: string) => {
  const response = await openmrsFetch<ShrConsent>(`${restBaseUrl}/kenyaemril/shr-visit/${visitId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};

/**
 * Fetches the patient's shared health records from
 * `GET /kenyaemril/hie-patient-history?patientUuid={uuid}&practitionerUuid={uuid}`.
 * Both query params are required; the request is skipped until they are present.
 */
export const useHiePatientHistory = (patientUuid: string, practitionerUuid?: string | null) => {
  const url =
    patientUuid && practitionerUuid
      ? `${restBaseUrl}/kenyaemril/hie-patient-history?patientUuid=${encodeURIComponent(
          patientUuid,
        )}&practitionerUuid=${encodeURIComponent(practitionerUuid)}`
      : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: SHRSummary }>(url, openmrsFetch);

  return {
    data: data?.data ?? null,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

interface SmsResponseData {
  status: string;
  message: string;
  id: string;
}
interface TokenResponse {
  token: string;
  issued: number; // Unix timestamp in milliseconds
  expires: number; // Unix timestamp in milliseconds
  status: string; // e.g., "success"
  expires_in: number; // Expiration duration in milliseconds (e.g., 1440000 ms = 24 minutes)
}

interface VerifyResponseData {
  response: string;
}

export const sendSHAOtp = async (phoneNumber: string, nationalId: string): Promise<SmsResponseData> => {
  const messageTemplate = 'Message template';
  const response = await openmrsFetch(
    `${restBaseUrl}/kenyaemr/send-kenyaemr-sms?phone=${phoneNumber}&nationalId=${nationalId}&message=${messageTemplate}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const rawResponseText = response.data;

  if (!rawResponseText) {
    throw new Error('SMS Gateway returned an empty response.');
  }

  // Use the extraction logic
  const extractedData = extractSmsData(rawResponseText);

  // Throw an error if parsing failed or the payload was missing
  if (!extractedData) {
    throw new Error(`Failed to parse SMS gateway response. Raw response: ${rawResponseText}`);
  }

  // Explicitly check for successful status from the gateway payload
  if (extractedData.status !== 'success') {
    throw new Error(`SMS delivery failed with status: ${extractedData.status}. Message: ${extractedData.message}`);
  }

  // Return the strongly-typed data to the caller
  return extractedData;
};

/**
 * Extracts and parses the JSON payload from a mixed-text SMS API response.
 * @param responseString The raw string response from the provider
 * @returns SmsResponseData object or null if parsing fails
 */
export function extractSmsData(responseString: string): SmsResponseData | null {
  try {
    // Regex to capture everything between the first '{' and the last '}'
    const jsonMatch = responseString.match(/\{.*\}/);

    if (!jsonMatch) {
      console.error('No JSON payload found in the response string.');
      return null;
    }

    // Parse the extracted JSON string
    const parsedData: SmsResponseData = JSON.parse(jsonMatch[0]);
    return parsedData;
  } catch (error) {
    console.error('Failed to parse SMS response data:', error);
    return null;
  }
}

export const verifyOtp = async (otp: string, uuid: string) => {
  const url = `${restBaseUrl}/kenyaemr/validate-otp`;
  const res = await openmrsFetch<VerifyResponseData>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { id: uuid, otp },
  });
  const data = res?.data?.response;
  try {
    const _data = JSON.parse(data) as TokenResponse;
    return { status: 'success', data: _data };
  } catch (error) {
    return { status: 'error', error: data };
  }
};
