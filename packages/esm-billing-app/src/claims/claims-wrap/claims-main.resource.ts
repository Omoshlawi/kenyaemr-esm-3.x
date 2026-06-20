import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type ClaimTabKey, type CloseReason, type PatientClaim, type PatientClaimsResponse } from './type';

export function partitionByTab(claim: PatientClaim): ClaimTabKey {
  const effectiveStage =
    (claim.provider_workflow_state ?? '').toUpperCase() || (claim.display_stage ?? '').toUpperCase();

  switch (effectiveStage) {
    case 'DRAFT':
    case 'PREAUTH_PENDING':
    case 'PREAUTH_APPROVED':
    case 'ELECTIVE_PENDING':
    case 'ELECTIVE_APPROVED':
    case 'ELECTIVE_DRAFT':
      return 'pending';

    case 'PAYER_PENDING':
    case 'SUBMITTED':
    case 'PROVIDER':
      return 'sent';

    case 'DRAFT_RESUBMIT':
    case 'PREAUTH_REJECTED':
    case 'ELECTIVE_REJECTED':
    case 'REJECTED':
    case 'FAILED_TO_SUBMIT':
      return 'resubmission';

    case 'CLOSED':
    case 'CANCELLED':
      return 'closed';

    case 'COMPLETED':
    case 'PAID':
      return 'paid';

    default:
      if (effectiveStage && typeof console !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn(
          `[partitionByTab] Unmapped claim stage "${effectiveStage}" on claim ${claim.authorization_code} — defaulting to 'pending'. Add to switch if recurring.`,
        );
      }
      return 'pending';
  }
}

export const usePatientClaims = (patientUuid: string, limit = 50) => {
  const url = patientUuid
    ? `${restBaseUrl}/virtualclaims/patient-claims?patient_uuid=${encodeURIComponent(patientUuid)}&limit=${limit}`
    : null;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<PatientClaimsResponse>>(url, openmrsFetch);

  return {
    claims: data?.data.claims ?? [],
    totalCount: data?.data.total_count ?? 0,
    isLoading,
    error,
    mutate,
  };
};

export const closeClaim = async (payload: {
  consent_token: string;
  cancel_reason_type: string;
  cancel_reason_text?: string;
}) => {
  const url = `${restBaseUrl}/virtualclaims/billing/close`;
  return openmrsFetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const useCloseReasons = () => {
  const url = `${restBaseUrl}/virtualclaims/billing/close-reasons`;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<Array<CloseReason>>>(url, openmrsFetch);
  return {
    closeReasons: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
};
