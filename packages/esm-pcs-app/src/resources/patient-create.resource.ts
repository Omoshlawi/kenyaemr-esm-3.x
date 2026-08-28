import { getSessionLocation, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { differenceInYears, parseISO } from 'date-fns';
import { generateIdentifier, openmrsId, openmrsIdSource, sanitizeName } from './identifiers';
import { type IdentifierTypeUuids, type PcsDependantDemographics, type PcsHieDependant } from '../types';

interface PatientIdentifier {
  identifier: string;
  identifierType: string;
  location: string;
  preferred: boolean;
}

/**
 * True when the dependant is under 18, or their birth date is unknown or unparseable.
 *
 * Load-bearing: minors in the HIE registry are identified by their SHA number, not a national ID.
 * A national ID present on a minor's record belongs to the household head (parent), so attaching
 * it to the child would write the parent's identity onto the child's record.
 */
const isMinorDependent = (birthDate?: string): boolean => {
  if (!birthDate || birthDate === 'Unknown') {
    return true;
  }

  try {
    return differenceInYears(new Date(), parseISO(birthDate)) < 18;
  } catch (error) {
    return true;
  }
};

/**
 * The identifiers to register a dependant with, taken straight from the flattened HIE contact.
 *
 * Express-workflow reaches the same result by building FHIR `identifiers` extensions and then
 * reading them back out to resolve each code to a type uuid; nothing between those two steps is
 * observable, so this maps the fields directly.
 */
export function buildDependantIdentifiers(
  dependant: PcsHieDependant,
  uuids: IdentifierTypeUuids,
  location: string,
): Array<PatientIdentifier> {
  const identifiers: Array<PatientIdentifier> = [];
  const add = (identifier: string | undefined, identifierType: string | undefined) => {
    if (identifier && identifierType) {
      identifiers.push({ identifier, identifierType, location, preferred: false });
    }
  };

  // `household-number` is deliberately absent: it holds the parent's own CR number.
  if (!isMinorDependent(dependant.birthDate)) {
    add(dependant.nationalId, uuids.nationalIdUUID);
  }
  add(dependant.birthCertificate, uuids.birthCertificateUUID);
  add(dependant.shaNumber, uuids.shaNumberUUID);
  add(dependant.shaIdNumber, uuids.crIdentificationNumberUUID);

  // The contact's own id IS the dependant's CR number when sha-id-number was not among the
  // extensions, so it stands in rather than being lost.
  if (!dependant.shaIdNumber && String(dependant.id ?? '').startsWith('CR')) {
    add(dependant.id, uuids.crIdentificationNumberUUID);
  }

  return identifiers;
}

/** Given/middle/family, preferring the HIE contact's own parts over splitting the display name. */
function splitDependantName(dependant: PcsHieDependant) {
  const parts = (dependant.name ?? '').trim().split(' ').filter(Boolean);
  const given: Array<string> = dependant.contactData?.name?.given ?? parts.slice(0, -1);
  const family = dependant.contactData?.name?.family || (parts.length > 1 ? parts[parts.length - 1] : '');

  return {
    givenName: given[0] || parts[0] || '',
    middleName: given.slice(1).join(' '),
    familyName: family,
  };
}

interface CreatePatientBody {
  person: {
    names: Array<{ preferred: boolean; givenName: string; middleName: string; familyName: string }>;
    gender: string;
    birthdate: string | null;
    birthdateEstimated: boolean;
    attributes: Array<{ attributeType: string; value: string }>;
    addresses: Array<Record<string, string>>;
  };
  identifiers: Array<PatientIdentifier>;
}

const EMPTY_ADDRESS = { address1: '', cityVillage: '', country: '', postalCode: '', stateProvince: '' };

/** Posts the registration and returns the created patient. */
async function postPatient(body: CreatePatientBody) {
  const { data } = await openmrsFetch<{ uuid: string }>(`${restBaseUrl}/patient`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  return data;
}

/**
 * The OpenMRS ID is minted for every patient and is always the preferred identifier; the HIE
 * identifiers ride alongside it, and are what let a later search find this record again.
 */
async function withOpenmrsId(identifiers: Array<PatientIdentifier>, location: string) {
  const generated = await generateIdentifier(openmrsIdSource);

  if (!generated?.data?.identifier) {
    throw new Error('Failed to generate OpenMRS identifier');
  }

  return [
    ...identifiers,
    { identifier: generated.data.identifier, identifierType: openmrsId, location, preferred: true },
  ];
}

async function requireSessionLocation() {
  const location = await getSessionLocation();

  if (!location?.uuid) {
    throw new Error('Could not determine session location');
  }

  return location.uuid;
}

/** Registers a dependant the HIE lists under their parent but who has no record here yet. */
export async function createDependantPatient(
  dependant: PcsHieDependant,
  uuids: IdentifierTypeUuids,
  parentPhoneNumber?: string,
) {
  const location = await requireSessionLocation();
  const { givenName, middleName, familyName } = splitDependantName(dependant);
  // `getDependentsFromContacts` reports a missing date as 'Unknown', which must not reach the
  // payload as a birthdate — it is what makes `birthdateEstimated` true.
  const birthdate = dependant.birthDate && dependant.birthDate !== 'Unknown' ? dependant.birthDate : null;

  return postPatient({
    person: {
      names: [
        {
          preferred: true,
          givenName: sanitizeName(givenName) || 'Unknown',
          middleName: sanitizeName(middleName) || '',
          familyName: sanitizeName(familyName) || 'Unknown',
        },
      ],
      gender: dependant.gender?.charAt(0).toUpperCase() || 'U',
      birthdate,
      birthdateEstimated: !birthdate,
      // The parent's number, not the dependant's — a child rarely has one of their own.
      attributes: parentPhoneNumber ? [{ attributeType: uuids.phoneAttributeTypeUUID, value: parentPhoneNumber }] : [],
      addresses: [{ ...EMPTY_ADDRESS, country: 'Kenya' }],
    },
    identifiers: await withOpenmrsId(buildDependantIdentifiers(dependant, uuids, location), location),
  });
}

/**
 * Registers a patient from plain demographics — a PCS participant's own details, or the
 * add-dependant form's. There is no HIE contact behind these, so only what was given is written.
 */
export async function createPatientFromDemographics(
  demographics: PcsDependantDemographics,
  nationalIdUUID: string,
  phoneAttributeTypeUUID: string,
) {
  const location = await requireSessionLocation();
  const identifiers: Array<PatientIdentifier> = [];

  // Carrying the national ID forward is what lets `findExistingLocalPatient` match this patient
  // later — and makes OpenMRS reject the create if they are already registered, rather than
  // silently producing a duplicate.
  if (demographics.nationalId) {
    identifiers.push({
      identifier: demographics.nationalId,
      identifierType: nationalIdUUID,
      location,
      preferred: false,
    });
  }

  return postPatient({
    person: {
      names: [
        {
          preferred: true,
          givenName: sanitizeName(demographics.firstName) || 'Unknown',
          middleName: sanitizeName(demographics.middleName ?? '') || '',
          familyName: sanitizeName(demographics.lastName) || 'Unknown',
        },
      ],
      gender: demographics.sex,
      birthdate: demographics.dateOfBirth ?? null,
      birthdateEstimated: !demographics.dateOfBirth,
      attributes: demographics.phone ? [{ attributeType: phoneAttributeTypeUUID, value: demographics.phone }] : [],
      addresses: [EMPTY_ADDRESS],
    },
    identifiers: await withOpenmrsId(identifiers, location),
  });
}

/** The HIE identifier codes, mapped onto the identifier types they are stored as here. */
function resolveIdentifierType(code: string | undefined, uuids: IdentifierTypeUuids): string | undefined {
  const map: Record<string, string> = {
    'sha-number': uuids.shaNumberUUID,
    'national-id': uuids.nationalIdUUID,
    'passport-number': uuids.passportUUID,
    'birth-certificate': uuids.birthCertificateUUID,
    'sha-id-number': uuids.crIdentificationNumberUUID,
  };

  return code ? map[code] : undefined;
}

/** Given/middle/family from a FHIR name, falling back to splitting its display text. */
function splitHumanName(name?: fhir.HumanName) {
  const given = name?.given ?? [];

  if (given.length > 0 || name?.family) {
    return {
      givenName: given[0] ?? '',
      middleName: given.slice(1).join(' '),
      familyName: name?.family ?? '',
    };
  }

  const parts = (name?.text ?? '').trim().split(' ').filter(Boolean);

  return {
    givenName: parts[0] ?? '',
    middleName: parts.slice(1, -1).join(' '),
    familyName: parts.length > 1 ? parts[parts.length - 1] : '',
  };
}

/**
 * Registers a patient from their HIE record — the path taken when the authorized patient is being
 * linked to a participant but has never been seen at this facility.
 */
export async function createPatientFromHiePatient(hiePatient: any, uuids: IdentifierTypeUuids) {
  const location = await requireSessionLocation();

  const identifiers: Array<PatientIdentifier> = (hiePatient?.identifier ?? [])
    .map((id: any) => ({
      identifier: id.value,
      identifierType: resolveIdentifierType(id.type?.coding?.[0]?.code, uuids),
      location,
      preferred: false,
    }))
    .filter((id: PatientIdentifier) => id.identifier && id.identifierType);

  // The HIE resource id is the patient's CR number.
  if (hiePatient?.id) {
    identifiers.push({
      identifier: hiePatient.id,
      identifierType: uuids.crIdentificationNumberUUID,
      location,
      preferred: false,
    });
  }

  const { givenName, middleName, familyName } = splitHumanName(hiePatient?.name?.[0]);
  const phone = hiePatient?.telecom?.find((contact: any) => contact.system === 'phone')?.value;
  const addresses = (hiePatient?.address ?? []).map((address: any) => ({
    ...EMPTY_ADDRESS,
    cityVillage: address.city || '',
    country: address.country || '',
  }));

  return postPatient({
    person: {
      names: [
        {
          preferred: true,
          givenName: sanitizeName(givenName) || 'Unknown',
          middleName: sanitizeName(middleName) || '',
          familyName: sanitizeName(familyName) || 'Unknown',
        },
      ],
      gender: hiePatient?.gender?.charAt(0).toUpperCase() || 'U',
      birthdate: hiePatient?.birthDate ?? null,
      birthdateEstimated: !hiePatient?.birthDate,
      attributes: phone ? [{ attributeType: uuids.phoneAttributeTypeUUID, value: phone }] : [],
      addresses: addresses.length > 0 ? addresses : [EMPTY_ADDRESS],
    },
    identifiers: await withOpenmrsId(identifiers, location),
  });
}
