import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

/** The OpenMRS ID identifier type and the idgen source that mints values for it. */
export const openmrsId = 'dfacd928-0370-4315-99d7-6ec1c9f7ae76';
export const openmrsIdSource = 'fb034aac-2353-4940-abe2-7bc94e7c1e71';

/** Mints the next OpenMRS ID from the configured identifier source. */
export function generateIdentifier(source: string) {
  const abortController = new AbortController();

  return openmrsFetch<{ identifier: string }>(`${restBaseUrl}/idgen/identifiersource/${source}/identifier`, {
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    body: {},
    signal: abortController.signal,
  });
}

/** Reads one identifier off a local (REST) patient record by its type uuid. */
export const getLocalIdentifierValue = (localPatient: any, typeUuid: string): string | undefined =>
  localPatient?.identifiers
    ?.find((identifier: any) => identifier?.identifierType?.uuid === typeUuid)
    ?.identifier?.trim() || undefined;

/** Strips anything OpenMRS will not accept in a person name. */
export const sanitizeName = (name: string): string => name?.trim().replace(/[^\w\s'\-\.]/g, '') || '';

export const getNationalIdFromPatient = (
  patient: fhir.Patient,
  nationalIdIdentifierTypeUuid?: string,
): string | null => {
  const nationalIdIdentifier = patient.identifier?.find((identifier) => {
    const coding = identifier.type?.coding?.[0];
    if (!coding) {
      return false;
    }
    const code = coding.code?.trim();
    const display = coding.display?.trim().toLowerCase();

    return (
      code === 'national-id' ||
      display === 'national id' ||
      (!!nationalIdIdentifierTypeUuid && code === nationalIdIdentifierTypeUuid)
    );
  });

  return nationalIdIdentifier?.value?.trim() || null;
};

export const getPhoneFromFhirPatient = (patient?: fhir.Patient): string | undefined =>
  patient?.telecom?.find((contact) => contact.system === 'phone' || contact.use === 'mobile')?.value?.trim() ||
  undefined;
