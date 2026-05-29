import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { ClaimResponse } from '../../../types';

const url =
  `${restBaseUrl}/claim?v=custom:(` +
  [
    'uuid',
    'claimCode',
    'billNumber',
    'dateFrom',
    'dateTo',
    'claimedTotal',
    'approvedTotal',
    'status',
    'use',
    'adjustment',
    'rejectionReason',
    'guaranteeId',
    'externalId',
    'serviceType',
    'claimAuthStatus',
    'isResubmitted',
    'hasClaimReview',
    'authorizationCode',
    'authorizationGuid',
    'workflowState',
    'totalClaimAmount',
    'totalClaimNetAmount',
    'totalClaimCopay',
    'totalClaimDiscount',
    'memberNumber',
    'invoiceNumber',
    'interventions',
    'packages',
    'externalApiErrors',
    'provider:(uuid,display)',
    'patient:(uuid,display)',
    'externalApiErrors',
    'visit:(uuid,display,visitType:(uuid,display),location:(uuid,display),startDatetime,stopDatetime),' +
      'bill:(uuid,totalAmount,paymentStatus,diagnosis)',
    'interventionDetails:(intervention_code,intervention_name,tariff,payment_mechanism,' +
      'workflow_state,sub_benefit_code,supported_scheme,intervention_fund,' +
      'needs_preauth,preauth_exist,applicable_document_types)',
    'invoices:(invoice_number,invoice_date,dispatch_status,workflow_state,' +
      'service_type,total_inv_amount,total_inv_net_amount,total_inv_copay,' +
      'total_inv_discount,lines)',
  ].join(',') +
  ')';

export const useClaims = () => {
  const { data, error, isLoading, mutate, isValidating } = useSWR<FetchResponse<{ results: Array<ClaimResponse> }>>(
    url,
    openmrsFetch,
  );

  return {
    claims: data?.data.results ?? [],
    error,
    isLoading,
    mutate,
    isValidating,
  };
};
