import useSWR from 'swr';
import { getPatientName } from '@openmrs/esm-framework';
import { getNationalIdFromPatient, getPhoneFromFhirPatient } from '../helper';
import { matchMockPcsPatients } from './pcs-mock-data';
import { type PcsPatient, type PcsSearchSubject } from './pcs.types';

export function usePcsPatientSearch(subject: PcsSearchSubject | null) {
  const key = subject ? `pcs-patient-search/${subject.id}` : null;

  const { data, isLoading, error } = useSWR<{ data: Array<PcsPatient> }>(key, (_: string) => {
    return new Promise<{ data: Array<PcsPatient> }>((resolve, _) => {
      setTimeout(() => resolve({ data: subject ? matchMockPcsPatients(subject) : [] }), 900);
    });
  });

  return { pcsPatients: data?.data ?? [], isLoading, error };
}

const normalize = (value?: string | null) => (value ?? '').toLowerCase().trim();

/**
 * Narrows an already-fetched candidate list. Purely client side — the registry is not
 * queried again
 */
export function filterPcsPatients(pcsPatients: Array<PcsPatient>, query: string): Array<PcsPatient> {
  const terms = normalize(query).split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return pcsPatients;
  }

  return pcsPatients.filter((pcsPatient) => {
    const haystack = [
      pcsPatient.name,
      pcsPatient.individualId,
      pcsPatient.village,
      pcsPatient.compoundHead,
      pcsPatient.nationalId,
      pcsPatient.phoneNumber,
    ]
      .map(normalize)
      .join(' ');

    return terms.every((term) => haystack.includes(term));
  });
}

/** Normalizes either side of the search results (local or HIE) into a PCS search subject. */
export function toPcsSearchSubject(
  patient: fhir.Patient,
  source: PcsSearchSubject['source'],
  nationalIdUUID?: string,
): PcsSearchSubject {
  return {
    id: patient.id!,
    source,
    name: getPatientName(patient),
    gender: patient.gender,
    birthDate: patient.birthDate,
    nationalId: getNationalIdFromPatient(patient, nationalIdUUID),
    phoneNumber: getPhoneFromFhirPatient(patient) ?? null,
  };
}
