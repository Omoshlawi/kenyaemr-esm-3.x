import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import useSWR from 'swr';

export type VirtualClaim = {
  virtual_claim_uuid: string;
  authorization_code: string;
  service_type: string;
  scheme_code: string;
  provider_workflow_state: string;
  payer_workflow_state: string | null;
  invoice_number: string | null;
  total_claim_amount: number;
  sync_status: string | null;
  provider_last_synced_at: number | null;
  payer_last_synced_at: number | null;
  date_created: number;
  visit_start: number | null;
  display_status: string;
  display_stage: string;
  patient_uuid?: string;
  patient_name?: string;
  bill_uuid?: string;
};

export type ClaimsFacilityOverview = {
  success: boolean;
  claims: VirtualClaim[];
  facility: {
    fr_code: string;
    official_name: string;
    keph_level: string;
    county: string;
    sub_county: string;
  };
  metrics: {
    total_claims: number;
    total_claim_amount_kes: number;
    provider_side: {
      by_workflow_state: {
        DRAFT: number;
        DRAFT_PROVIDER: number;
        DRAFT_RESUBMIT: number;
        ELECTIVE_DRAFT: number;
        ELECTIVE_APPROVED: number;
        SUBMITTED: number;
        FAILED_TO_SUBMIT: number;
        CLOSED: number;
      };
      with_invoice: number;
      without_invoice: number;
      sync_health: {
        ok: number;
        error: number;
        pending_invoice: number;
        never: number;
      };
    };
    payer_side: {
      by_workflow_state: {
        APPROVED: number;
        REJECTED: number;
        SENT_BACK: number;
        MANUAL_REVIEW: number;
        CLINICAL_REVIEW: number;
        MEDICAL_REVIEW: number;
        UNDER_SURVEILLANCE: number;
        SENT_FOR_PAYMENT_PROCESSING: number;
        PAYMENT_COMPLETED: number;
        PARTIALLY_PAID: number;
        _not_yet_at_payer: number;
      };
      total_approved_amount_kes: number;
      total_rejected_amount_kes: number;
      total_paid_amount_kes: number;
      sync_health: {
        never_synced: number;
        has_synced: number;
      };
    };
  };
};

export const useClaimsMetrics = (fromDate?: string, toDate?: string, serviceType?: string) => {
  const from = fromDate ?? dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  const to = toDate ?? dayjs().format('YYYY-MM-DD');
  let url = `${restBaseUrl}/virtualclaims/facility-overview?from_date=${from}&to_date=${to}`;
  if (serviceType) {
    url += `&service_type=${encodeURIComponent(serviceType)}`;
  }

  const { data, isLoading, error, mutate } = useSWR<{ data: ClaimsFacilityOverview }>(url, openmrsFetch, {
    errorRetryCount: 2,
  });

  return {
    data: data?.data ?? null,
    claims: data?.data?.claims ?? [],
    isLoading,
    error,
    mutate,
  };
};
