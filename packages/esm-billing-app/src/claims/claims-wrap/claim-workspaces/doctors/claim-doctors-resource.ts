import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { TFunction } from 'i18next';
import { extractFetchError, extractUpstreamError } from '../../../claims-management/table/virtual-claim-preauth/utils';
import {
  AddDoctorPayload,
  AddDoctorResponse,
  ClaimDoctorsResponse,
  IdentificationTypesResponse,
} from '../../../claims-management/table/virtual-claim-preauth/type';
import useSWR from 'swr';

export const addDoctorToClaim = async (
  consentToken: string,
  doctor: AddDoctorPayload,
  t: TFunction,
): Promise<{
  ok: boolean;
  error?: string;
  doctorName?: string;
  mirrorUuid?: string;
  mirrored?: boolean;
}> => {
  if (!consentToken) {
    return { ok: false, error: t('noConsentToken', 'No consent token provided') };
  }

  try {
    const response = await openmrsFetch(`${restBaseUrl}/virtualclaims/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consent_token: consentToken,
        identification_number: doctor.identificationNumber,
        identification_type: doctor.identificationType,
        regulation_body: doctor.regulationBody,
      }),
    });

    const data = response.data as AddDoctorResponse;

    if (!response.ok || data.success === false) {
      const fallback = data.error ?? t('addDoctorFailed', 'Add doctor failed');
      const errMsg = data.upstream_error
        ? extractUpstreamError({ error: data.error, upstream_error: data.upstream_error } as any, fallback)
        : fallback;
      return { ok: false, error: errMsg };
    }

    return {
      ok: true,
      doctorName: data.doctor?.doctor_name,
      mirrorUuid: data.mirror_uuid,
      mirrored: data.mirrored === true,
    };
  } catch (err) {
    const networkFallback =
      err instanceof Error ? err.message : typeof err === 'string' ? err : t('unknownError', 'Unknown error');
    return {
      ok: false,
      error: extractFetchError(
        err,
        t('addDoctorNetworkError', 'Could not add doctor: {{message}}', { message: networkFallback }),
      ),
    };
  }
};

export const useIdentificationTypes = () => {
  const url = `${restBaseUrl}/virtualclaims/professional-registry/identification-types`;
  const { data, error, isLoading } = useSWR<FetchResponse<IdentificationTypesResponse>>(url, openmrsFetch);
  return {
    types: data?.data?.identification_types ?? [],
    isLoading,
    error,
  };
};

export const useClaimDoctors = (consentToken: string | null) => {
  const url = consentToken
    ? `${restBaseUrl}/virtualclaims/doctors?consent_token=${encodeURIComponent(consentToken)}`
    : null;
  const { data, error, isLoading, mutate } = useSWR<FetchResponse<ClaimDoctorsResponse>>(url, openmrsFetch);
  return {
    doctors: data?.data?.doctors ?? [],
    total: data?.data?.total ?? 0,
    isLoading,
    error,
    mutate,
  };
};
