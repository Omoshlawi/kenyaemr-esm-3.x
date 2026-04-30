import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { useMemo } from 'react';
import useSWR from 'swr';
import {
  type ConceptResponse,
  type DiagnosisResult,
  type PreauthSubmitResult,
  type ProviderResult,
  type RawProvider,
  type SubmitPreauthPayload,
} from '../type';
import { type BillingConfig } from '../../../../../config-schema';
import { type PreauthQueueItem } from '../../../../../billing-form/social-health-authority/type';
import { buildPreauthFormData, extractIcdCode, getProviderAttr } from '../utils';

export const submitPreauth = async (payload: SubmitPreauthPayload): Promise<PreauthSubmitResult> => {
  const itemShim = {
    authorization_code: payload.authorizationCode,
    intervention_code: payload.interventionCode,
    tariff: payload.tariff,
  } as PreauthQueueItem;

  const fd = buildPreauthFormData(payload.formData, itemShim, false);
  const url = `${restBaseUrl}/virtualclaim/preauth/files`;

  const response = await fetch(`/openmrs${url}`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });

  const data = await response.json();

  if (response.ok && data.success !== false) {
    return {
      success: true,
      authorizationCode: data.authorization_code ?? payload.authorizationCode,
      message: data.message,
    };
  }

  return {
    success: false,
    upstreamError: data.upstream_error?.message ?? data.error ?? 'Submission failed',
  };
};

export const cancelPreauth = async (authorizationCode: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`/openmrs${restBaseUrl}/virtualclaim/preauth/cancel`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        consent_token: authorizationCode,
        cancel_reason_type: 'OTHER_REASONS',
        cancel_reason_text: 'Resubmitting preauth with updated information',
      }),
    });
    return { success: response.ok };
  } catch {
    return { success: false, error: 'Failed to cancel existing preauth' };
  }
};

export const useDiagnosis = (searchQuery: string) => {
  const { icd11DataSourceUuid } = useConfig<BillingConfig>();
  const url = `${restBaseUrl}/concept?v=custom:(uuid,display,mappings:(display,conceptMapType:(display)))&q=${encodeURIComponent(
    searchQuery,
  )}&source=${icd11DataSourceUuid}&limit=20`;

  const { isLoading, error, data } = useSWR<{ data: ConceptResponse }>(
    searchQuery?.length >= 3 ? url : null,
    openmrsFetch,
  );

  const diagnoses: Array<DiagnosisResult> = useMemo(
    () =>
      (data?.data?.results ?? []).map((c) => ({
        uuid: c.uuid,
        display: c.display,
        icdCode: extractIcdCode(c),
      })),
    [data],
  );

  return { isLoading, error, diagnoses };
};

export const useProviderSearch = (query: string) => {
  const { licenseNumberUuid, licenseBodyUuid, providerNationalIdUuid } = useConfig<BillingConfig>();

  const url = `${restBaseUrl}/provider?q=${encodeURIComponent(
    query,
  )}&v=custom:(uuid,display,person:(display),attributes:(uuid,value,attributeType:(uuid,display),voided))&limit=10`;

  const { data, isLoading, error } = useSWR<{ data: { results: Array<RawProvider> } }>(
    query?.length >= 2 ? url : null,
    openmrsFetch,
  );

  const providers: Array<ProviderResult> = (data?.data?.results ?? []).map((p) => ({
    uuid: p.uuid,
    display: p.display,
    person: p.person,
    licenseNumber: getProviderAttr(p.attributes, licenseNumberUuid),
    licenseBody: getProviderAttr(p.attributes, licenseBodyUuid),
    nationalId: getProviderAttr(p.attributes, providerNationalIdUuid),
  }));

  return { providers, isLoading, error };
};
