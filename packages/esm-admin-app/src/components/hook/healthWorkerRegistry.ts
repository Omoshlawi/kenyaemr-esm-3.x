import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { HWR_API_NO_CREDENTIALS, PROVIDER_NOT_FOUND, RESOURCE_NOT_FOUND, UNKNOWN } from '../../constants';

export interface ProfessionalRegistryResponse {
  success: boolean;
  regulator: string;
  identification_type: string;
  identification_number: string;
  professional: {
    membership: {
      id: string;
      full_name: string;
      gender: string;
      first_name: string;
      middle_name: string;
      last_name: string;
      registration_id: string;
      external_reference_id: string;
      licensing_body: string;
      specialty: string;
      is_active: number;
    };
    licenses?: Array<{
      id: string;
      external_reference_id: string;
      license_type: string;
      license_start: string;
      license_end: string;
    }>;
    professional_details?: {
      professional_cadre?: string;
      practice_type?: string;
      educational_qualifications?: string;
    };
    contacts?: {
      phone?: string;
      email?: string;
      postal_address?: string;
    };
    identifiers?: {
      identification_type?: string;
      identification_number?: string;
    };
  };
}

export const searchHealthCareWork = async (
  identifierType: string,
  identifierNumber: string,
  regulator: string,
): Promise<ProfessionalRegistryResponse> => {
  const url = `${restBaseUrl}/virtualclaims/professional-registry?${new URLSearchParams({
    identification_number: identifierNumber,
    identification_type: identifierType,
    regulator,
  }).toString()}`;

  try {
    const response = await openmrsFetch<ProfessionalRegistryResponse>(url);
    if (!response.data?.success || !response.data?.professional) {
      throw new Error(PROVIDER_NOT_FOUND);
    }
    return response.data;
  } catch (err: any) {
    if (err?.message === PROVIDER_NOT_FOUND) {
      throw err;
    }
    const status = err?.response?.status;
    if (status === 401) {
      throw new Error(HWR_API_NO_CREDENTIALS);
    }
    if (status === 404) {
      throw new Error(RESOURCE_NOT_FOUND);
    }
    throw new Error(UNKNOWN);
  }
};
