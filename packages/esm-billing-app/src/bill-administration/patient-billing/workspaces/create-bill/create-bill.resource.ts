import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { virtualClaimBaseUrl } from '../../../../claims/claims-management/table/virtual-claim-preauth/constants';
import { ClaimVisitResponse } from './type';

interface VisitAttribute {
  value: string;
  attributeType: {
    uuid: string;
  };
}

interface VisitWithAttributes {
  uuid: string;
  attributes: Array<VisitAttribute>;
}

export const useVisitAttribute = (visitUuid: string, attributeTypeUuid: string) => {
  const customRep = 'custom:(attributes:(value,attributeType:(uuid)))';
  const url = visitUuid && attributeTypeUuid ? `${restBaseUrl}/visit/${visitUuid}?v=${customRep}` : null;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<VisitWithAttributes>>(url, openmrsFetch);

  const visitAttribute = data?.data?.attributes?.find((attr) => attr.attributeType?.uuid === attributeTypeUuid);

  const isSHA = visitAttribute?.value?.toUpperCase() === 'SHA';
  const claimSchemeCode = visitAttribute?.value ?? null;

  return { visitAttribute, isSHA, claimSchemeCode, error, isLoading, mutate };
};

export const useClaimForVisit = (visitUuid: string) => {
  const url = visitUuid ? `${virtualClaimBaseUrl}/claim-for-visit?visit_uuid=${visitUuid}` : null;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<ClaimVisitResponse>>(url, openmrsFetch);

  const claim = data?.data ?? null;
  const isNotFound = error?.response?.status === 404;

  return {
    authorizationCode: claim?.authorization_code ?? null,
    workflowState: claim?.workflow_state ?? null,
    virtualClaimUuid: claim?.virtual_claim_uuid ?? null,
    schemeCode: claim?.scheme_code ?? null,
    serviceType: claim?.service_type ?? null,
    emergencyVisitExpiry: claim?.emergency_visit_expiry ?? null,
    beneficiaryCrId: claim?.beneficiary_cr_id ?? null,
    interventions: claim?.interventions ?? [],
    hasNoClaim: isNotFound,
    isLoading,
    error: isNotFound ? null : error,
    mutate,
  };
};
