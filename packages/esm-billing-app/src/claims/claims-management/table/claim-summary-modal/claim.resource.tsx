import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface closeClaimPayload {
  cancel_reason_type: string;
  cancel_reason_text: string;
  visit_uuid?: string;
  bill_uuid?: string;
}
export async function closeInsuranceClaim(
  cancelReasonType: string,
  cancelReasonText: string,
  visitUuid?: string,
  billUuid?: string,
) {
  const body: closeClaimPayload = {
    cancel_reason_type: cancelReasonType,
    cancel_reason_text: cancelReasonText,
    visit_uuid: visitUuid,
  };

  if (billUuid) {
    body.bill_uuid = billUuid;
  }

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
  visit_uuid?: string,
) {
  const body = {
    line_id: String(claimLineId),
    quantity,
    unit_price: String(unitPrice),
    visit_uuid: visit_uuid,
  };

  return await openmrsFetch(`${restBaseUrl}/insuranceclaims/bill/line/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function resubmitInsuranceClaimLine(visit_uuid: string) {
  const body = {
    visit_uuid: visit_uuid,
  };

  return await openmrsFetch(`${restBaseUrl}/insuranceclaims/bill/line/resubmit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteInsuranceClaimLine(claimLineId: string, visit_uuid: string) {
  const body = {
    line_guid: String(claimLineId),
    visit_uuid: visit_uuid,
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
    visit_uuid: visitUuid,
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
