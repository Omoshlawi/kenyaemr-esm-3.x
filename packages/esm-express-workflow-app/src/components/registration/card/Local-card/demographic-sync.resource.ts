import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type LocalPatient } from '../../type';

export const splitHieName = (
  hiePatient: fhir.Patient,
): { givenName: string; middleName: string; familyName: string } => {
  const name = hiePatient?.name?.[0];
  const given = (name?.given || []).filter(Boolean).map((part) => part.trim());
  const family = (name?.family || '').trim();

  if (given.length === 0 && !family && name?.text) {
    const parts = name.text.trim().split(/\s+/);
    return {
      givenName: parts[0] ?? '',
      middleName: parts.slice(1, -1).join(' '),
      familyName: parts.length > 1 ? parts[parts.length - 1] : '',
    };
  }

  return {
    givenName: given[0] ?? '',
    middleName: given.slice(1).join(' '),
    familyName: family,
  };
};

const toOpenmrsDate = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const match = value.trim().match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : undefined;
};

export const syncLocalPatientFromHIE = async (localPatient: LocalPatient, hiePatient: fhir.Patient): Promise<void> => {
  const personUuid = localPatient?.uuid;
  if (!personUuid) {
    throw new Error('Local patient is missing a uuid');
  }

  const { givenName, middleName, familyName } = splitHieName(hiePatient);
  const nameUuid = localPatient.person?.personName?.uuid;
  if (nameUuid && (givenName || familyName)) {
    await openmrsFetch(`${restBaseUrl}/person/${personUuid}/name/${nameUuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { givenName, middleName, familyName },
    });
  }

  const personPayload: Record<string, string> = {};
  if (hiePatient?.gender) {
    personPayload.gender = hiePatient.gender.trim().charAt(0).toUpperCase();
  }
  const birthdate = toOpenmrsDate(hiePatient?.birthDate);
  if (birthdate) {
    personPayload.birthdate = birthdate;
  }

  if (Object.keys(personPayload).length > 0) {
    await openmrsFetch(`${restBaseUrl}/person/${personUuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: personPayload,
    });
  }
};
