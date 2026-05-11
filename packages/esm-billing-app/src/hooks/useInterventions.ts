import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';

const VIRTUAL_CLAIM_BASE = `${restBaseUrl}/virtualclaims`;

export interface InterventionsFilter {
  package_code?: string;
  applicable_gender?: 'MALE' | 'FEMALE';
}

interface Intervention {
  interventionCode: string;
  interventionName: string;
  interventionPackage: string;
  interventionSubPackage: string;
  interventionDescription?: string;
  insuranceSchemes?: string;
}

interface VirtualClaimIntervention {
  code: string;
  name: string;
}

/**
 * Hook that returns a list of interventions based on filters
 * @param filters - Filters for interventions (package_code, applicable_gender)
 * @param patientCRId - patient CR number used by virtual-claim endpoint
 * @param subBenefitCode - selected sub-benefit code used by virtual-claim endpoint
 * @returns
 */
export const useInterventions = (filters?: InterventionsFilter, patientCRId?: string, subBenefitCode?: string) => {
  const params = new URLSearchParams();

  if (filters?.package_code) {
    params.append('package_code', filters.package_code);
  }

  if (filters?.applicable_gender) {
    params.append('applicable_gender', filters.applicable_gender.toLowerCase());
  }

  const hasVirtualClaimParams = Boolean(patientCRId && subBenefitCode);
  const virtualClaimParams = new URLSearchParams({
    patient_id: patientCRId ?? '',
    sub_benefit_code: subBenefitCode ?? '',
  });

  const url = hasVirtualClaimParams
    ? `${VIRTUAL_CLAIM_BASE}/interventions?${virtualClaimParams.toString()}`
    : `${restBaseUrl}/insclaims/interventions?${params.toString()}`;

  const allInterventionsUrl = hasVirtualClaimParams ? null : `${restBaseUrl}/insclaims/interventions`;

  const { data, isLoading, error } = useSWR<
    FetchResponse<{ data: Array<Intervention> } | { count: number; results: Array<VirtualClaimIntervention> }>
  >(url, openmrsFetch);

  const { data: allData } = useSWR<FetchResponse<{ data: Array<Intervention> }>>(allInterventionsUrl, openmrsFetch);

  const interventions = hasVirtualClaimParams
    ? data?.data && 'results' in data.data
      ? data.data.results.map((intervention) => ({
          interventionCode: intervention.code,
          interventionName: intervention.name,
          interventionPackage: '',
          interventionSubPackage: '',
        }))
      : []
    : data?.data && 'data' in data.data
    ? data.data.data
    : [];

  const allInterventions = hasVirtualClaimParams ? interventions : allData?.data?.data ?? [];
  return {
    isLoading,
    interventions,
    allInterventions,
    error,
  };
};
