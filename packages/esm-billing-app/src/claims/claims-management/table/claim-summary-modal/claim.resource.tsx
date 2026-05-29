import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface closeClaimPayload {
  cancel_reason_type: string;
  cancel_reason_text: string;
  patient_uuid?: string;
}

export interface EditClaimLineResult {
  success: boolean;
  message?: string;
  upstreamError?: string;
}

export interface CloseClaimResult {
  success: boolean;
  message?: string;
  upstreamError?: string;
}

export interface DeleteClaimLineResult {
  success: boolean;
  message?: string;
  upstreamError?: string;
}

export interface SubmitClaimResult {
  success: boolean;
  message?: string;
  upstreamError?: string;
}

export async function closeInsuranceClaim(
  cancelReasonType: string,
  cancelReasonText: string,
  patientUuid?: string,
): Promise<CloseClaimResult> {
  const body: closeClaimPayload = {
    cancel_reason_type: cancelReasonType,
    cancel_reason_text: cancelReasonText,
    patient_uuid: patientUuid,
  };

  const url = `${restBaseUrl}/insuranceclaims/bill/close`;

  const response = await fetch(`/openmrs${url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  const data = await response.json();

  if (response.ok && data.success !== false) {
    return {
      success: true,
      message: data.message,
    };
  }

  return {
    success: false,
    upstreamError: data.upstream_error?.message ?? data.error ?? 'Failed to close claim',
  };
}

export async function editInsuranceClaimLine(
  claimLineId: string,
  quantity: number,
  unitPrice: string,
  patient_uuid?: string,
  consent_token?: string,
): Promise<EditClaimLineResult> {
  const body = {
    line_id: String(claimLineId),
    quantity,
    unit_price: String(unitPrice),
    patient_uuid: patient_uuid,
    consent_token: consent_token,
  };

  const url = `${restBaseUrl}/insuranceclaims/bill/line/edit`;

  const response = await fetch(`/openmrs${url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  const data = await response.json();

  if (response.ok && data.success !== false) {
    return {
      success: true,
      message: data.message,
    };
  }

  return {
    success: false,
    upstreamError: data.upstream_error?.message ?? data.error ?? 'Failed to edit claim line',
  };
}

export async function deleteInsuranceClaimLine(
  claimLineId: string,
  patient_uuid: string,
): Promise<DeleteClaimLineResult> {
  const body = {
    line_guid: String(claimLineId),
    patient_uuid: patient_uuid,
  };

  const url = `${restBaseUrl}/insuranceclaims/bill/line/delete`;

  const response = await fetch(`/openmrs${url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  const data = await response.json();

  if (response.ok && data.success !== false) {
    return {
      success: true,
      message: data.message,
    };
  }

  return {
    success: false,
    upstreamError: data.upstream_error?.message ?? data.error ?? 'Failed to delete claim line',
  };
}

export async function resubmitInsuranceClaimIntitiation(patient_uuid: string): Promise<SubmitClaimResult> {
  const body = {
    patient_uuid: patient_uuid,
  };

  const url = `${restBaseUrl}/insuranceclaims/bill/resubmit`;

  const response = await fetch(`/openmrs${url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  const data = await response.json();

  if (response.ok && data.success !== false) {
    return {
      success: true,
      message: data.message,
    };
  }

  return {
    success: false,
    upstreamError: data.upstream_error?.message ?? data.error ?? 'Failed to resubmit claim line',
  };
}

export async function resubmitInsuranceClaimLine(patient_uuid: string): Promise<SubmitClaimResult> {
  return await resubmitInsuranceClaimIntitiation(patient_uuid);
}

export async function submitInsuranceClaim(
  isInpatientClaim: boolean,
  authorizationCode: string,
  receiptNumber: string,
  visitUuid: string,
  inpatientData?: {
    otp: string;
    dischargeDate: string;
    dischargeReason: string;
  },
): Promise<SubmitClaimResult> {
  const endpoint = isInpatientClaim
    ? `${restBaseUrl}/insuranceclaims/bill/inpatient/submit`
    : `${restBaseUrl}/insuranceclaims/bill/outpatient/submit`;

  const body: any = {
    consent_token: authorizationCode,
    invoice_number: receiptNumber,
    patient_uuid: visitUuid,
  };

  if (isInpatientClaim && inpatientData) {
    body.otp = inpatientData.otp;
    body.discharge_date = inpatientData.dischargeDate;
    body.discharge_reason = inpatientData.dischargeReason;
  }

  const response = await fetch(`/openmrs${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(body),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  const data = await response.json();

  if (response.ok && data.success !== false) {
    return {
      success: true,
      message: data.message,
    };
  }

  return {
    success: false,
    upstreamError: data.upstream_error?.message ?? data.error ?? 'Failed to submit claim',
  };
}

export async function getClaimPayerPreview(invoiceNumber: string) {
  const response = await openmrsFetch(
    `${restBaseUrl}/insuranceclaims/claims/preview/payer?provider_claim_no=${invoiceNumber}`,
    {
      method: 'GET',
    },
  );

  // Normalize different possible response shapes and extract first result
  const results = response?.data?.results || response?.data?.claim_preview_payer?.results || null;

  if (results && results.length > 0) {
    const claimData = results[0];

    return {
      data: {
        workflowState: claimData.workflowState ?? claimData.workflow_state ?? null,
        workflowDisplayName: claimData.workflowDisplayName ?? claimData.workflow_display_name ?? null,
        created: claimData.created ?? claimData.creationDate ?? null,
        claimNotes: claimData.claimNotes ?? claimData.claim_notes ?? [],
        trackingNumber: claimData.trackingNumber ?? claimData.tracking_number ?? null,
      },
    };
  }

  return { data: null };
}

// add a function for removing a claim line

// add a function for removing a claim line attachment

// add a function for removing a claim diagnosis
