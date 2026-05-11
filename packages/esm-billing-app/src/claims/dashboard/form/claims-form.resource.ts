import { openmrsFetch, restBaseUrl, type Visit } from '@openmrs/esm-framework';
import { useMemo } from 'react';
import useSWR from 'swr';
import useSWRImmutable from 'swr/immutable';
import { mockInterventions, mockPackages } from './claims-form.mocks';
import z from 'zod';
import { extractSavannahErrorMessage } from '../../../helpers';

interface Provider {
  uuid: string;
  display: string;
}

interface ProvidersResponse {
  results: Provider[];
}

interface ExtendedVisit extends Visit {
  attributes: Array<{
    uuid: string;
    display: string;
    attributeType: {
      uuid: string;
      display: string;
    };
    value: string;
  }>;
}
export interface SHAPackagesAndInterventionVisitAttribute {
  packages: Array<string>;
  interventions: Array<string>;
}

export function useVisit(patientUuid?: string) {
  const customRepresentation =
    'custom:(uuid,patient,voided,encounters:(uuid,diagnoses:(uuid,display,certainty,diagnosis:(coded:(uuid,display))),encounterDatetime,encounterType:(uuid,display),encounterProviders:(uuid,display,provider:(uuid,person:(uuid,display)))),location:(uuid,name,display),visitType:(uuid,name,display),startDatetime,stopDatetime,attributes)&limit=1';

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: { results: Array<ExtendedVisit> } }, Error>(
    patientUuid ? `${restBaseUrl}/visit?patient=${patientUuid}&v=${customRepresentation}` : null,
    openmrsFetch,
  );

  return {
    visits: data?.data?.results[0] ?? null,
    error,
    isLoading,
    isValidating,
    mutateVisits: mutate,
  };
}

export const useProviders = () => {
  const customRepresentation = 'custom:(uuid,display)';
  const url = `/ws/rest/v1/provider?v=${customRepresentation}`;
  const { data, error, isLoading } = useSWRImmutable<{ data: ProvidersResponse }>(url, openmrsFetch);

  return { data, error, isLoading };
};

export const processClaims = (payload: unknown) => {
  const url = `/ws/rest/v1/insuranceclaims/claims`;
  return openmrsFetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

const base64ToBlob = (base64DataUrl: string, mimeType = 'application/octet-stream') => {
  const base64 = base64DataUrl.includes(',') ? base64DataUrl.split(',')[1] : base64DataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
};

export const submitCombinedBills = async (
  selectedLineItems: any[],
  supportingDocuments: any[],
  diagnoses: any[],
  defaultInterventionCode: string,
  visitUuid?: string,
) => {
  for (const item of selectedLineItems) {
    const formData = new FormData();
    const attachments = supportingDocuments.map((doc: any, index: number) => ({
      document_title: doc.name || `attachment-${index + 1}`,
      document_type: doc.purpose,
      file_field_name: `attachments_${index}_file_blob`,
    }));

    const combinedBillPayload = {
      intervention_code: defaultInterventionCode,
      charge_date: new Date().toISOString(),
      service_name: item.billableService?.replace(/^[a-f0-9-]+:/i, '').trim() || item.display || 'Service',
      service_identifier: item.uuid,
      unit_price: item.price ?? 0,
      quantity: item.quantity ?? 1,
      diagnoses: diagnoses,
      attachments,
      visit_uuid: visitUuid,
    };

    formData.append('payload', JSON.stringify(combinedBillPayload));

    supportingDocuments.forEach((doc: any, index: number) => {
      const fileBlob = base64ToBlob(doc.base64, doc.type);
      formData.append(`attachments_${index}_file_blob`, fileBlob, doc.name || `attachment-${index + 1}`);
    });

    try {
      const response = await openmrsFetch(`${restBaseUrl}/insuranceclaims/combined-bills`, {
        method: 'POST',
        body: formData,
      });

      // Check if response indicates failure
      if (!response.ok || (response.data && !response.data.success)) {
        const errorData = response.data;
        const errorMessage =
          errorData?.error ||
          errorData?.upstream_error?.message ||
          errorData?.message ||
          'Failed to process combined bill';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      throw new Error(extractSavannahErrorMessage(error));
    }
  }
};

export const createBillsForItems = async (
  selectedLineItems: any[],
  defaultInterventionCode: string,
  visitUuid?: string,
) => {
  for (const item of selectedLineItems) {
    const itemPayload = {
      intervention_code: defaultInterventionCode,
      service_name: item.billableService?.replace(/^[a-f0-9-]+:/i, '').trim() || item.display || 'Service',
      service_identifier: item.uuid,
      unit_price: item.price ?? 0,
      quantity: String(item.quantity ?? 1),
      visit_uuid: visitUuid,
    };

    try {
      const response = await openmrsFetch(`${restBaseUrl}/insuranceclaims/bills`, {
        method: 'POST',
        body: JSON.stringify(itemPayload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok || (response.data && !response.data.success)) {
        const errorData = response.data;
        const errorMessage =
          errorData?.error || errorData?.upstream_error?.message || errorData?.message || 'Failed to create bill item';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      throw new Error(extractSavannahErrorMessage(error));
    }
  }
};

export const submitDiagnoses = async (diagnoses: string[], defaultInterventionCode: string, visitUuid?: string) => {
  for (const diagnosis of diagnoses) {
    const diagnosisPayload = {
      icd_code: diagnosis,
      intervention_code: defaultInterventionCode,
      visit_uuid: visitUuid,
    };

    try {
      const response = await openmrsFetch(`${restBaseUrl}/insuranceclaims/bill-diagnosis`, {
        method: 'POST',
        body: JSON.stringify(diagnosisPayload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok || (response.data && !response.data.success)) {
        const errorData = response.data;
        const errorMessage =
          errorData?.error || errorData?.upstream_error?.message || errorData?.message || 'Failed to submit diagnosis';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      throw new Error(extractSavannahErrorMessage(error));
    }
  }
};

export const uploadAttachments = async (
  supportingDocuments: any[],
  defaultInterventionCode: string,
  visitUuid?: string,
) => {
  for (const doc of supportingDocuments) {
    const formData = new FormData();
    formData.append('document_type', doc.purpose);
    formData.append('intervention_code', doc.intervention || defaultInterventionCode);
    formData.append('visit_uuid', visitUuid || '');
    const fileBlob = base64ToBlob(doc.base64, doc.type);
    formData.append('file_blob', fileBlob, doc.name || 'attachment');

    try {
      const response = await openmrsFetch(`${restBaseUrl}/insuranceclaims/bill-attachment`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok || (response.data && !response.data.success)) {
        const errorData = response.data;
        const errorMessage =
          errorData?.error || errorData?.upstream_error?.message || errorData?.message || 'Failed to upload attachment';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      throw new Error(extractSavannahErrorMessage(error));
    }
  }
};

export const retryClaim = (claimUUID: string) => {
  const url = `/ws/rest/v1/insuranceclaims/claims/sendToExternal?claimUuid=${claimUUID}`;
  return openmrsFetch(url, {
    method: 'GET',
  });
};

export const updateAllClaimStatuses = () => {
  const url = `${restBaseUrl}/insuranceclaims/claim/update-status-all`;
  return openmrsFetch(url, {
    method: 'GET',
  });
};
export const useInterventions = () => {
  const interventions = useMemo(() => mockInterventions, []);
  return {
    isLoading: false,
    interventions: interventions,
    error: undefined,
  };
};

export const usePackages = () => {
  const _packages = useMemo(() => mockPackages, []);
  return {
    isLoading: false,
    packages: _packages,
    error: undefined,
  };
};

export type ClaimPreviewInvoiceLine = {
  id: string;
  item_code?: string;
  item_name?: string;
  invoice?: string;
  intervention_code?: string;
  line_total_amount?: string | number;
  line_net_amount?: string | number;
  quantity?: number;
  unit?: string;
  unit_price?: string | number;
  charge_date?: string;
  scheme_code?: string;
  scheme_name?: string;
  discount?: string | number;
  is_active?: boolean;
  is_cancellation?: boolean;
  is_return?: boolean;
  line_number?: string;
  uhc_exceeded?: boolean;
  paymentStatus?: string;
  [key: string]: any;
};

export type ClaimPreviewInvoice = {
  id: string;
  invoice_number?: string;
  invoice_date?: string;
  dispatch_status?: string;
  workflow_state?: string;
  created_by_name?: string;
  patient_name?: string;
  patient_number?: string;
  provider_name?: string;
  scheme_code?: string;
  scheme_name?: string;
  service_type?: string;
  total_inv_amount?: string | number;
  total_inv_net_amount?: string | number;
  total_inv_copay?: string | number;
  total_inv_discount?: string | number;
  lines?: ClaimPreviewInvoiceLine[];
  visit_start?: string;
  [key: string]: any;
};

export type ClaimPreviewIntervention = {
  id?: string;
  intervention_code?: string;
  intervention_name?: string;
  intervention_payment_mechanism?: string;
  keph_level_tarrif?: string | number;
  accrued_per_diem_amount?: string | number;
  accrued_per_diem_days?: number;
  workflow_state?: string;
  [key: string]: any;
};

export type ClaimPreview = {
  // core identifiers
  id?: string | number;
  uuid?: string;

  // snake_case preview fields
  workflow_state?: string;
  claim_auth_status?: string;
  total_claim_amount?: string | number;
  total_claim_net_amount?: string | number;
  total_claim_copay?: string | number;
  total_claim_discount?: string | number;
  total_claim_splits?: string | number;
  is_negative?: boolean;
  is_zero?: boolean;
  created_by_name?: string;
  invoices?: ClaimPreviewInvoice[];
  interventions?: ClaimPreviewIntervention[];
  claim_diagnoses?: Array<any>;
  claim_attachments?: Array<any>;
  patient_name?: string;
  patient_number?: string;
  member_number?: string;
  scheme_code?: string;
  scheme_name?: string;
  provider_name?: string;
  service_type?: string;
  visit_start?: string;
  number_of_invoices?: number;
  diagnoses_count?: number;
  claim_attachments_count?: number;
  invoice_attachments_count?: number;
  authorization_code?: string;
  balance?: number;
  closed?: boolean;

  [key: string]: any;
};

type ClaimPreviewResponse = {
  success?: boolean;
  claim_preview?: ClaimPreview;
} & Partial<ClaimPreview>;

const claimPreviewFetcher = async ([url, patient_uuid]: [string, string]): Promise<ClaimPreview> => {
  const response = await openmrsFetch<ClaimPreviewResponse>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ patient_uuid }),
  });

  return response.data.claim_preview ?? response.data;
};

export const useClaimPreview = (patient_uuid?: string) => {
  const url = `${restBaseUrl}/insuranceclaims/bill/preview`;
  const { data, isLoading, error } = useSWR<ClaimPreview>([url, patient_uuid], claimPreviewFetcher);

  return {
    claimPreview: data,
    isLoading,
    error,
  };
};

export const updateClaimStatus = (claimUuid: string) => {
  const url = `/ws/rest/v1/insuranceclaims/claim/update-status?claimUuid=${claimUuid}`;
  return openmrsFetch(url, {
    method: 'GET',
  });
};

export const ClaimsFormSchemaBase = z.object({
  claimExplanation: z.string(),
  claimJustification: z.string(),
  diagnoses: z.array(z.string()),
  visitType: z.string(),
  facility: z.string(),
  treatmentStart: z.string(),
  treatmentEnd: z.string(),
  packages: z.array(z.string()),
  interventions: z.array(z.string()),
  provider: z.string(),
});

export const ClaimsFormSchema = z.object({
  claimExplanation: z.string().min(1, { message: 'Claim explanation is required' }),
  claimJustification: z.string().min(1, { message: 'Claim justification is required' }),
  diagnoses: z.array(z.string()).min(1, { message: 'At least one diagnosis is required' }),
  visitType: z.string().min(1, { message: 'Visit type is required' }),
  facility: z.string().min(1, { message: 'Facility is required' }),
  treatmentStart: z.string().min(1, { message: 'Treatment start date is required' }),
  treatmentEnd: z.string().min(1, { message: 'Treatment end date is required' }),
  packages: z.array(z.string()).min(1, { message: 'At least one package is required' }),
  interventions: z.array(z.string()).min(1, { message: 'At least one intervention is required' }),
  provider: z.string().min(1, { message: 'Provider is required' }),
  supportingDocuments: z
    .object({
      name: z.string(),
      type: z.string(),
      size: z.number(),
      base64: z.string(),
      intervention: z.string(),
      purpose: z.enum([
        'CLAIM_FORM',
        'PREAUTH_FORM',
        'DISCHARGE_SUMMARY',
        'PRESCRIPTION',
        'LAB_ORDER',
        'INVOICE',
        'BIO_DETAILS',
        'IMAGING_ORDER',
        'OTHER',
        'FINAL_BILL',
        'LAB_RESULTS',
        'DEATH_NOTICE',
        'THEATRE_NOTES',
        'BIRTH_NOTIFICATION',
      ]),
      uploadedAt: z.date({ coerce: true }),
    })
    .array(),
});

export function fileToBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}
