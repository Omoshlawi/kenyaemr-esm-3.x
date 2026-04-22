import { openmrsFetch, restBaseUrl, type FetchResponse } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { OTPResponse, PreauthQueueItem, SHAIntervention, SHASubBenefit, VirtualClaimResponse } from './type';

const VIRTUAL_CLAIM_BASE = `${restBaseUrl}/virtualclaims`;

export const useSHASubBenefits = (patientCRId: string) => {
  const url = patientCRId ? `${VIRTUAL_CLAIM_BASE}/sub-benefits?patient_id=${patientCRId}` : null;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ count: number; results: Array<SHASubBenefit> }>>(
    url,
    openmrsFetch,
  );

  return {
    subBenefits: data?.data?.results ?? [],
    count: data?.data?.count ?? 0,
    isLoading,
    error,
    mutate,
  };
};

export const useSHAInterventions = (patientCRId: string, subBenefitCode: string) => {
  const url =
    patientCRId && subBenefitCode
      ? `${VIRTUAL_CLAIM_BASE}/interventions?patient_id=${patientCRId}&sub_benefit_code=${subBenefitCode}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ count: number; results: Array<SHAIntervention> }>>(
    url,
    openmrsFetch,
  );

  return {
    interventions: data?.data?.results ?? [],
    count: data?.data?.count ?? 0,
    isLoading,
    error,
    mutate,
  };
};

export const usePreauthQueue = (status: 'ALL' | 'PENDING_PREAUTH' | 'PREAUTH_SUBMITTED' | 'AUTHORIZED' = 'ALL') => {
  const url = `${VIRTUAL_CLAIM_BASE}/preauth-queue?status=${status}`;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ count: number; results: Array<PreauthQueueItem> }>>(
    url,
    openmrsFetch,
  );

  return {
    queue: data?.data?.results ?? [],
    count: data?.data?.count ?? 0,
    isLoading,
    error,
    mutate,
  };
};

export const sendSHAOtp = async (patientCRId: string, interventionCodes: string[]): Promise<OTPResponse> => {
  const response = await openmrsFetch(`${VIRTUAL_CLAIM_BASE}/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      patient_id: patientCRId,
      intervention_codes: interventionCodes,
    },
  });
  return response.data;
};

export async function createSHAVirtualClaim(
  patientCRId: string,
  otp: string,
  serviceType: string,
  interventionCodes: string[],
  visitUuid: string,
  patientUuid: string,
  inpatientFields?: {
    admission_date?: string;
    estimated_days_of_admission?: number;
  },
): Promise<VirtualClaimResponse> {
  const body: Record<string, any> = {
    patient_id: patientCRId,
    otp,
    service_type: serviceType,
    intervention_codes: interventionCodes,
    visit_uuid: visitUuid,
    patient_uuid: patientUuid,
  };

  if (serviceType === 'INPATIENT' && inpatientFields) {
    if (inpatientFields.admission_date) {
      body.admission_date = inpatientFields.admission_date;
    }
    if (inpatientFields.estimated_days_of_admission != null) {
      body.estimated_days_of_admission = inpatientFields.estimated_days_of_admission;
    }
  }

  const response = await openmrsFetch(`${VIRTUAL_CLAIM_BASE}/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return response.data;
}

export const getPatientCRNumber = (patient: fhir.Patient, shaIdentifierTypeUUID: string): string | null => {
  if (!patient?.identifier) {
    return null;
  }
  const shaId = patient.identifier.find((id: fhir.Identifier) => id?.type?.coding?.[0]?.code === shaIdentifierTypeUUID);
  return shaId?.value ?? null;
};

export const usePatientPhone = (patientUuid: string) => {
  const { data } = useSWR<{
    data: { person: { attributes: Array<{ attributeType: { display: string }; value: string }> } };
  }>(
    patientUuid
      ? `${restBaseUrl}/patient/${patientUuid}?v=custom:(person:(attributes:(attributeType:(display),value)))`
      : null,
    openmrsFetch,
  );
  return (
    data?.data?.person?.attributes?.find(
      (attr) =>
        attr.attributeType?.display?.toLowerCase().includes('phone') ||
        attr.attributeType?.display?.toLowerCase().includes('telephone'),
    )?.value ?? ''
  );
};
