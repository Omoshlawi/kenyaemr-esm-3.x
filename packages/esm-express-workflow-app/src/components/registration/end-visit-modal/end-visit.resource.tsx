import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export type ProcessVisitResponse = {
  service_type: string;
  consentToken?: string;
  invoiceNumber?: string | null;
  interventions?: string[];
  message?: string;
  [key: string]: unknown;
};

export type SubmitVisitResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

export function processVisitInsuranceClaim(visitUuid: string) {
  return openmrsFetch<ProcessVisitResponse>(`${restBaseUrl}/insuranceclaims/phc/processVisit?visitUuid=${visitUuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function sendDischargeOtp(
  patientCRId: string,
  consentToken: string,
): Promise<{ success?: boolean; error?: string }> {
  const params = new URLSearchParams({ patientId: patientCRId, consentToken });
  const response = await openmrsFetch<{ success?: boolean; error?: string }>(
    `${restBaseUrl}/insuranceclaims/phc/sendDischargeOtp?${params.toString()}`,
    { method: 'POST' },
  );
  return response.data;
}

export async function submitVisitClaim(params: {
  visitUuid: string;
  otp?: string;
  dischargeReason?: string;
  dischargeAuthGuid?: string;
  invoiceNumber?: string;
}): Promise<SubmitVisitResponse> {
  const query = new URLSearchParams({ visitUuid: params.visitUuid, invoiceNumber: params.invoiceNumber ?? '' });
  if (params.otp) {
    query.set('otp', params.otp);
  }
  if (params.dischargeReason) {
    query.set('dischargeReason', params.dischargeReason);
  }
  if (params.dischargeAuthGuid) {
    query.set('dischargeAuthGuid', params.dischargeAuthGuid);
  }
  const response = await openmrsFetch<SubmitVisitResponse>(
    `${restBaseUrl}/insuranceclaims/phc/submitVisit?${query.toString()}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  return response.data;
}
