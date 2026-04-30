import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { FacilityClaim } from '../../../types';

const extractInterventions = (claim: FacilityClaim): string[] => {
  if (Array.isArray(claim.interventions) && claim.interventions.length > 0) {
    return claim.interventions;
  }

  const shaBenefitsAttribute = claim.visit?.attributes?.find(
    (attribute) => attribute.attributeType?.display === 'SHA Benefits Package',
  );

  if (!shaBenefitsAttribute?.value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(shaBenefitsAttribute.value) as { interventions?: unknown };
    return Array.isArray(parsedValue.interventions)
      ? parsedValue.interventions.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
};

export const useFacilityClaims = () => {
  const url = `${restBaseUrl}/claim?v=full`;

  const { data, error, isLoading, mutate, isValidating } = useSWR<FetchResponse<{ results: Array<FacilityClaim> }>>(
    url,
    openmrsFetch,
  );

  const formatClaim = (
    claim: FacilityClaim,
  ): FacilityClaim & {
    id: string;
    providerName: string;
    patientName: string;
    patientId?: string;
    visitType?: { uuid: string; display: string };
  } => ({
    ...claim,
    interventions: extractInterventions(claim),
    id: claim.uuid,
    providerName: claim.provider?.person?.display || claim.provider?.display || '',
    approvedTotal: claim.approvedTotal ?? 0,
    status: claim.status,
    patientName: claim.patient?.display || '',
    insurer: claim.insurer ?? '',
    patientId: claim.patient?.uuid,
    visitType: claim.visitType,
  });

  const formattedClaims = data?.data.results.map(formatClaim) ?? [];

  return {
    claims: formattedClaims,
    error,
    isLoading,
    mutate,
    isValidating,
  };
};
