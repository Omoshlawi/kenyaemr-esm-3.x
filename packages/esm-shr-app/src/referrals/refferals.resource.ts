import { FetchResponse, openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { CommunityReferral, EmtCase } from '../types';
import { ReferralConfigObject } from '../config-schema';

export const useCommunityReferrals = (status: string) => {
  const shrSummaryUrl = `/ws/rest/v1/kenyaemril/communityReferrals?status=${status}`;
  const { data, mutate, error, isLoading, isValidating } = useSWR<{ data: Array<CommunityReferral> }>(
    shrSummaryUrl,
    openmrsFetch,
  );

  return {
    referrals: data?.data ?? [],
    isError: error,
    isLoading: isLoading,
    isValidating,
  };
};

export const processCommunityReferral = (id: number) => {
  const url = `/ws/rest/v1/kenyaemril/serveReferredClient`;
  return openmrsFetch(url, {
    method: 'POST',
    body: { referralMessageId: id },
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export async function pullFacilityReferrals() {
  const abortController = new AbortController();
  return openmrsFetch(`/ws/rest/v1/kenyaemril/pullShrReferrals`, {
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
  });
}

export async function pullEmmegencyCases() {
  const abortController = new AbortController();
  return openmrsFetch(`/ws/rest/v1/kenyaemril/pull-emt-cases`, {
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
  });
}

export const useCommunityReferral = (nupi: string) => {
  const referralUrl = `${restBaseUrl}/kenyaemril/communityReferralByNupi?nupi=${nupi}`;
  const { data, error, isLoading, isValidating } = useSWR<{ data: CommunityReferral }>(
    nupi ? referralUrl : null,
    openmrsFetch,
    { errorRetryCount: 3, errorRetryInterval: 5000 },
  );

  return {
    referral: data?.data ?? null,
    isError: error,
    isLoading: isLoading,
    isValidating,
  };
};

export const useEmtCases = (status: string = 'All') => {
  const shrSummaryUrl = `${restBaseUrl}/kenyaemril/emt-cases?status=${encodeURIComponent(status || 'All')}`;
  const { data, mutate, error, isLoading, isValidating } = useSWR<{ data: Array<EmtCase> }>(
    shrSummaryUrl,
    openmrsFetch,
  );

  return {
    referrals: data?.data ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

export interface Provider {
  uuid: string;
  display: string;
  attributes: Array<{
    display: string;
    attributeType: {
      uuid: string;
      display: string;
    };
    value: string;
  }>;
}
export const useProviders = (search: string = '') => {
  const customRepresentation = 'custom:(uuid,display,attributes:(display,attributeType:(uuid,display),value))';
  const url = search.length > 2 ? `/ws/rest/v1/provider?v=${customRepresentation}&q=${search}` : null;
  const { providerPhoneNumberAttributeType } = useConfig<ReferralConfigObject>();
  const { data, error, isLoading } = useSWR<FetchResponse<{ results: Array<Provider> }>>(url, openmrsFetch);
  const getProviderPhoneNumber = (provider?: Provider) => {
    return (
      provider?.attributes.find((attr) => attr.attributeType.uuid === providerPhoneNumberAttributeType)?.value ?? ''
    );
  };
  return { providers: data?.data?.results ?? [], error, isLoading, getProviderPhoneNumber };
};

export const initiateHandoverConcent = (practitionerUuid: string, caseNumber: string) => {
  const url = `${restBaseUrl}/kenyaemril/emt-cases/${caseNumber}/handover/initiate`;
  return openmrsFetch<EmtCase>(url, {
    method: 'POST',
    body: { practitionerUuid },
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const submitHandoverConcent = (caseNumber: string, otp: string) => {
  const url = `${restBaseUrl}/kenyaemril/emt-cases/${caseNumber}/handover/verify`;
  return openmrsFetch(url, {
    method: 'POST',
    body: { otp },
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export type ResolvedPatient = {
  uuid: string;
  givenName?: string;
  familyName?: string;
};

/**
 * Onboards an accepted EMT case as an OpenMRS patient and returns the resolved
 * patient. The server registers a placeholder patient (with demographics for
 * registration to correct) for an unidentified arrival, and reuses an existing
 * patient when one already holds the case's CR ID, so calling this twice for a
 * case is safe.
 */
export const serveEmtClient = async (caseNumber: string): Promise<ResolvedPatient> => {
  const { data } = await openmrsFetch<ResolvedPatient>(`${restBaseUrl}/kenyaemril/serve-emt-client`, {
    method: 'POST',
    body: { caseNumber },
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return data;
};
