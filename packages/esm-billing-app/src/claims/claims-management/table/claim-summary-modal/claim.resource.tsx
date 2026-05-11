import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface closeClaimPayload {
  cancel_reason_type: string;
  cancel_reason_text: string;
  patient_uuid?: string;
}
export async function closeInsuranceClaim(cancelReasonType: string, cancelReasonText: string, patientUuid?: string) {
  const body: closeClaimPayload = {
    cancel_reason_type: cancelReasonType,
    cancel_reason_text: cancelReasonText,
    patient_uuid: patientUuid,
  };

  return await openmrsFetch(`${restBaseUrl}/insuranceclaims/bill/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function editInsuranceClaimLine(
  claimLineId: string,
  quantity: number,
  unitPrice: string,
  patient_uuid?: string,
) {
  const body = {
    line_id: String(claimLineId),
    quantity,
    unit_price: String(unitPrice),
    patient_uuid: patient_uuid,
  };

  return await openmrsFetch(`${restBaseUrl}/insuranceclaims/bill/line/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function resubmitInsuranceClaimLine(patient_uuid: string) {
  const body = {
    patient_uuid: patient_uuid,
  };

  return await openmrsFetch(`${restBaseUrl}/insuranceclaims/bill/line/resubmit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteInsuranceClaimLine(claimLineId: string, patient_uuid: string) {
  const body = {
    line_guid: String(claimLineId),
    patient_uuid: patient_uuid,
  };

  return await openmrsFetch(`${restBaseUrl}/insuranceclaims/bill/line/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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
) {
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

  return await openmrsFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function getClaimPayerPreview(invoiceNumber: string) {
  // 9b. Retrieve Payer Claim Preview — GET /claims/preview/payer?provider_claim_no=...

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
      },
    };
  }

  return { data: null };
}
