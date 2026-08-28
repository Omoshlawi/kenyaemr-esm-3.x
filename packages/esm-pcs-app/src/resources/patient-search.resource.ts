import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

const CUSTOM_PATIENT_REPRESENTATION =
  'custom:(patientId,uuid,identifiers,display,patientIdentifier:(uuid,identifier),person:(gender,age,birthdate,birthdateEstimated,personName,addresses,display,dead,deathDate),attributes:(value,attributeType:(uuid,display)))';

/** National ID first, then SHA, then birth certificate — most to least likely to be on file here. */
const IDENTIFIER_PRIORITY: Record<string, number> = {
  'national-id': 1,
  'sha-number': 2,
  'birth-certificate': 3,
};

/**
 * The identifiers to search a patient by. A dependant carries theirs in `extension` entries
 * rather than an `identifier` array, which is why the two are read differently.
 */
export const extractPatientIdentifiers = (patient: any, isDependent = false) => {
  const identifiers: Array<{ value: string; type: string }> = [];

  if (isDependent) {
    const identifierExtensions = patient?.extension?.filter((ext: any) => ext.url === 'identifiers') || [];

    identifierExtensions.forEach((ext: any) => {
      const code = ext.valueIdentifier?.type?.coding?.[0]?.code;
      // 'household-number' holds the household head's (parent's) own CR number, not an identifier
      // unique to this dependent. Searching by it would match the parent's local patient record.
      if (ext.valueIdentifier?.value && code && code !== 'household-number') {
        identifiers.push({ value: ext.valueIdentifier.value, type: code });
      }
    });

    return identifiers;
  }

  if (Array.isArray(patient?.identifier)) {
    patient.identifier.forEach((id: any) => {
      if (id.value && id.type?.coding?.[0]?.code) {
        identifiers.push({ value: id.value, type: id.type.coding[0].code });
      }
    });
  }

  return identifiers;
};

/**
 * Looks a patient up locally by one identifier. Falls back to a `q=` search when no type is
 * given, filtering the results down to a real identifier match — `q=` matches on name too.
 */
export const searchLocalPatientByIdentifier = async (identifierValue: string, identifierType?: string) => {
  if (!identifierValue) {
    return null;
  }

  try {
    const byIdentifier = await openmrsFetch(
      `${restBaseUrl}/patient?identifier=${encodeURIComponent(identifierValue)}&v=${CUSTOM_PATIENT_REPRESENTATION}`,
    );

    if (byIdentifier?.data?.results?.length > 0) {
      return byIdentifier.data.results[0];
    }

    if (!identifierType) {
      const byQuery = await openmrsFetch(
        `${restBaseUrl}/patient?q=${encodeURIComponent(identifierValue)}&v=${CUSTOM_PATIENT_REPRESENTATION}`,
      );

      const matching = (byQuery?.data?.results ?? []).filter((patient: any) =>
        patient.identifiers?.some(
          (id: any) => id.identifier === identifierValue || id.display?.includes(identifierValue),
        ),
      );

      if (matching.length > 0) {
        return matching[0];
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

/** The local record for a patient, or null when none of their identifiers resolve to one. */
export const findExistingLocalPatient = async (patient: any, isDependent = false) => {
  const identifiers = extractPatientIdentifiers(patient, isDependent);

  if (identifiers.length === 0) {
    return null;
  }

  const prioritized = [...identifiers].sort(
    (a, b) => (IDENTIFIER_PRIORITY[a.type] || 999) - (IDENTIFIER_PRIORITY[b.type] || 999),
  );

  for (const identifier of prioritized) {
    const existing = await searchLocalPatientByIdentifier(identifier.value, identifier.type).catch(() => null);
    if (existing) {
      return existing;
    }
  }

  return null;
};
