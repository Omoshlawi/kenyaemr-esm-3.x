import { FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { Patient } from '../types';

const usePatient = (uuid: string) => {
  const customPresentation = 'custom:(uuid,display,links,identifiers:(identifier,identifierType:(uuid,display)))';
  const url = `${restBaseUrl}/patient/${uuid}?v=${customPresentation}`;
  const { isLoading, error, data } = useSWR<FetchResponse<Patient>>(url, openmrsFetch);
  return { isLoading, error, patient: data?.data };
};

export default usePatient;
