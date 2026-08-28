import { getPatientName, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import {
  type HIEBundleResponse,
  type EligibilityResponse,
  type Scheme,
  HIEContact,
  InputDependent,
  DependentPayload,
  HIEPatient,
  type RegistrationSearchSubject,
} from '../type';
import { isWithinInterval, parseISO, format, differenceInYears } from 'date-fns';

/**
 * Extracts eligibility data from the EligibilityResponse structure.
 * Since the EligibilityResponse is already a direct object, no parsing is needed.
 *
 * @param {EligibilityResponse} [eligibilityData] - The eligibility response data object.
 * @returns {null | EligibilityResponse} The eligibility data or null if not available.
 */
export const parseEligibilityResponse = (eligibilityData?: EligibilityResponse) => {
  if (!eligibilityData) {
    return null;
  }

  return eligibilityData;
};

/**
 * Checks if a scheme is eligible and currently active
 */
const isSchemeEligibleAndActive = (scheme: Scheme): boolean => {
  if (scheme.coverage.status !== '1') {
    return false;
  }

  try {
    const now = new Date();
    const startDate = parseISO(scheme.coverage.startDate);
    const endDate = parseISO(scheme.coverage.endDate);
    return isWithinInterval(now, { start: startDate, end: endDate });
  } catch (error) {
    console.error('Error parsing dates:', error);
    return false;
  }
};

/**
 * Get eligibility for a specific scheme (checks both PRIMARY and BENEFICIARY)
 */
const getSchemeEligibility = (
  schemes: Scheme[],
  schemeName: string,
): { eligible: boolean; memberType: string | null; scheme: Scheme | null } => {
  const schemeMatches = schemes.filter((s) => s.schemeName.toUpperCase() === schemeName.toUpperCase());

  if (schemeMatches.length === 0) {
    return { eligible: false, memberType: null, scheme: null };
  }

  // Check PRIMARY first
  const primaryScheme = schemeMatches.find((s) => s.memberType === 'PRIMARY');
  if (primaryScheme && isSchemeEligibleAndActive(primaryScheme)) {
    return { eligible: true, memberType: 'PRIMARY', scheme: primaryScheme };
  }

  // Check BENEFICIARY
  const beneficiaryScheme = schemeMatches.find((s) => s.memberType === 'BENEFICIARY');
  if (beneficiaryScheme && isSchemeEligibleAndActive(beneficiaryScheme)) {
    return { eligible: true, memberType: 'BENEFICIARY', scheme: beneficiaryScheme };
  }

  return { eligible: false, memberType: null, scheme: schemeMatches[0] };
};

/**
 * Extracts relevant eligibility status from the new EligibilityResponse structure.
 *
 * @param {EligibilityResponse} [eligibilityData] - The eligibility response data.
 * @returns {null | {
 *   isUHCEligible: boolean,
 *   isSHIFEligible: boolean,
 *   isTSCEligible: boolean,
 *   isPOMSFEligible: boolean,
 *   memberCrNumber: string,
 *   fullName: string,
 *   schemes: Scheme[],
 *   uhcMemberType: string | null,
 *   shifMemberType: string | null,
 *   tscMemberType: string | null,
 *   pomsfMemberType: string | null,
 * }}
 */
export const getEligibilityStatus = (eligibilityData?: EligibilityResponse) => {
  const parsedData = parseEligibilityResponse(eligibilityData);

  if (!parsedData || !parsedData.schemes) {
    return null;
  }

  const uhcEligibility = getSchemeEligibility(parsedData.schemes, 'UHC');
  const shifEligibility = getSchemeEligibility(parsedData.schemes, 'SHIF');
  const tscEligibility = getSchemeEligibility(parsedData.schemes, 'TSC');
  const pomsfEligibility = getSchemeEligibility(parsedData.schemes, 'POMSF');

  return {
    isUHCEligible: uhcEligibility.eligible,
    isSHIFEligible: shifEligibility.eligible,
    isTSCEligible: tscEligibility.eligible,
    isPOMSFEligible: pomsfEligibility.eligible,
    memberCrNumber: parsedData.memberCrNumber,
    fullName: parsedData.fullName,
    schemes: parsedData.schemes,
    uhcMemberType: uhcEligibility.memberType,
    shifMemberType: shifEligibility.memberType,
    tscMemberType: tscEligibility.memberType,
    pomsfMemberType: pomsfEligibility.memberType,
  };
};

/**
 * Retrieves the National ID from a FHIR Patient resource.
 *
 * @param {fhir.Patient} patient - The patient resource.
 * @returns {string | null} The National ID, if found, or null.
 */
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

/**
 * Returns the total number of patients pulled from the HIE from the given bundle.
 *
 * @param {Array<HIEBundleResponse> | null} hieResults - The HIE bundle response, or null if there is no data.
 * @returns {number} The total number of patients pulled from the HIE.
 */
export const getPulledPatientCount = (hieResults: Array<HIEBundleResponse> | null): number => {
  if (!hieResults || !Array.isArray(hieResults)) {
    return 0;
  }
  return hieResults.reduce((total, bundle) => total + (bundle?.total || 0), 0);
};

/**
 * Masks a full name by leaving the first two characters of each part
 * unmasked, and replacing the rest with asterisks.
 *
 * @param {string} fullName - The full name to mask.
 * @returns {string} The masked full name.
 */
export function maskName(fullName: string) {
  const maskedParts = fullName
    .trim()
    .split(' ')
    .map((part) => {
      if (part.length <= 2) {
        return part;
      }

      const firstTwo = part.slice(0, 2);
      const maskLength = part.length - 2;
      return firstTwo + '*'.repeat(maskLength);
    });

  return maskedParts.join(' ');
}

/**
 * Given a FHIR Patient resource, extract the list of dependents (contacts)
 * and transform them into a structured object with the following properties:
 * - id: a unique identifier for the dependent (either the contact's id, or if
 *   not present, a generated identifier like 'contact-<index>')
 * - name: the dependent's name, or 'Unknown' if not present
 * - relationship: the dependent's relationship to the patient, or 'Unknown' if
 *   not present
 * - phoneNumber: the dependent's phone number, or 'N/A' if not present
 * - email: the dependent's email address, or 'N/A' if not present
 * - gender: the dependent's gender, or 'Unknown' if not present
 * - birthDate: the dependent's date of birth, or 'Unknown' if not present
 * - shaNumber: the dependent's SHA number, or undefined if not present
 * - nationalId: the dependent's national ID, or undefined if not present
 * - birthCertificate: the dependent's birth certificate number, or undefined
 *   if not present
 * - contactData: the original contact resource for the dependent
 *
 * @param {fhir.Patient} patient - The patient resource with contacts.
 * @returns {Array<{[key: string]: string | undefined}>} The list of dependents.
 */
export const extractDependentsFromContacts = (patient: fhir.Patient) => {
  if (!patient?.contact) {
    return [];
  }

  return patient.contact.map((contact, index) => {
    const relationship = contact.relationship?.[0]?.coding?.[0]?.display || 'Unknown';

    const name =
      contact.name?.text?.trim() ||
      `${contact.name?.given?.join(' ') || ''} ${contact.name?.family || ''}`.trim() ||
      'Unknown';

    const phoneContact = contact.telecom?.find((t) => t.system === 'phone');
    const phoneNumber = phoneContact?.value || 'N/A';

    const emailContact = contact.telecom?.find((t) => t.system === 'email');
    const email = emailContact?.value || 'N/A';

    const gender = contact.gender || 'Unknown';

    const birthDateExtension = contact.extension?.find(
      (ext) => ext.url === 'https://ts.kenya-hie.health/fhir/StructureDefinition/date_of_birth',
    );
    const birthDate = birthDateExtension?.valueString || 'Unknown';

    const identifierExtensions = contact.extension?.filter((ext) => ext.url === 'identifiers') || [];
    const shaNumber = identifierExtensions.find((ext) => ext.valueIdentifier?.type?.coding?.[0]?.code === 'sha-number')
      ?.valueIdentifier?.value;
    const shaIdNumber = identifierExtensions.find(
      (ext) => ext.valueIdentifier?.type?.coding?.[0]?.code === 'sha-id-number',
    )?.valueIdentifier?.value;

    const nationalId = identifierExtensions.find(
      (ext) => ext.valueIdentifier?.type?.coding?.[0]?.code === 'national-id',
    )?.valueIdentifier?.value;

    const birthCertificate = identifierExtensions.find(
      (ext) => ext.valueIdentifier?.type?.coding?.[0]?.code === 'birth-certificate',
    )?.valueIdentifier?.value;

    return {
      id: contact.id || `contact-${index}`,
      name,
      relationship,
      phoneNumber,
      email,
      gender,
      birthDate,
      shaNumber,
      nationalId,
      birthCertificate,
      contactData: contact,
      shaIdNumber,
    };
  });
};

/**
 * Determines whether a dependent is a minor (under 18 years old) based on their birth date.
 * Dependents with an unknown or unparseable birth date are treated as minors so that we
 * default to the safer path of not attaching an adult-only identifier like national ID.
 *
 * @param {string} [birthDate] - The dependent's birth date, in ISO format.
 * @returns {boolean} true if the dependent is under 18, or their birth date is unknown/invalid.
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

export const transformToDependentPayload = (dependent: InputDependent, parentId?: string): DependentPayload => {
  const extensions: HIEContact['extension'] = [];

  // Minors in the HIE registry are identified by their SHA number, not a national ID.
  // A national ID present on the dependent record for a minor would belong to the
  // household head (parent), so it must not be attached to the child's own record.
  const isMinor = isMinorDependent(dependent.birthDate);

  if (dependent.nationalId && !isMinor) {
    extensions.push({
      url: 'identifiers',
      valueIdentifier: {
        use: 'official',
        type: {
          coding: [
            {
              system: 'https://ts.kenya-hie.health/Codesystem/identifier-types',
              code: 'national-id',
              display: 'National ID',
            },
          ],
        },
        value: dependent.nationalId,
      },
    });
  }

  if (dependent.birthCertificate) {
    extensions.push({
      url: 'identifiers',
      valueIdentifier: {
        use: 'official',
        type: {
          coding: [
            {
              system: 'https://ts.kenya-hie.health/Codesystem/identifier-types',
              code: 'birth-certificate',
              display: 'Birth Certificate',
            },
          ],
        },
        value: dependent.birthCertificate,
      },
    });
  }

  if (dependent.shaNumber) {
    extensions.push({
      url: 'identifiers',
      valueIdentifier: {
        use: 'official',
        type: {
          coding: [
            {
              system: 'https://ts.kenya-hie.health/Codesystem/identifier-types',
              code: 'sha-number',
              display: 'SHA Number',
            },
          ],
        },
        value: dependent.shaNumber,
      },
    });
  }
  if (dependent.shaIdNumber) {
    extensions.push({
      url: 'identifiers',
      valueIdentifier: {
        use: 'official',
        type: {
          coding: [
            {
              system: 'https://ts.kenya-hie.health/Codesystem/identifier-types',
              code: 'sha-id-number',
              display: 'CR Number',
            },
          ],
        },
        value: dependent.shaIdNumber,
      },
    });
  }

  if (dependent.householdNumber) {
    extensions.push({
      url: 'identifiers',
      valueIdentifier: {
        use: 'official',
        type: {
          coding: [
            {
              system: 'https://ts.kenya-hie.health/Codesystem/identifier-types',
              code: 'household-number',
              display: 'Household Number',
            },
          ],
        },
        value: dependent.householdNumber,
      },
    });
  }

  if (dependent.birthDate && dependent.birthDate !== 'Unknown') {
    extensions.push({
      url: 'https://ts.kenya-hie.health/fhir/StructureDefinition/date_of_birth',
      valueString: dependent.birthDate,
    });
  }

  extensions.push({
    url: 'https://ts.kenya-hie.health/fhir/StructureDefinition/person_with_disability',
    valueString: '0',
  });

  extensions.push({
    url: 'https://ts.kenya-hie.health/fhir/StructureDefinition/citizenship',
    valueString: 'kenyan',
  });

  const nameParts = dependent.name.trim().split(' ');
  const givenNames = nameParts.slice(0, -1);
  const familyName = nameParts[nameParts.length - 1];

  const name: HIEContact['name'] = {
    text: dependent.name,
    family: dependent.contactData?.name?.family || familyName || '',
    given: dependent.contactData?.name?.given || (givenNames.length > 0 ? givenNames : [dependent.name.split(' ')[0]]),
  };

  const telecom: HIEContact['telecom'] = [];
  if (dependent.email) {
    telecom.push({
      system: 'email',
      value: dependent.email,
    });
  }
  if (dependent.phoneNumber) {
    telecom.push({
      system: 'phone',
      value: dependent.phoneNumber,
    });
  }

  const addressExtensions: HIEContact['address']['extension'] = [];

  if (dependent.county) {
    addressExtensions.push({
      url: 'https://ts.kenya-hie.health/fhir/StructureDefinition/patients-county',
      valueString: dependent.county,
    });
  }

  if (dependent.subCounty) {
    addressExtensions.push({
      url: 'https://ts.kenya-hie.health/fhir/StructureDefinition/patients-sub-county',
      valueString: dependent.subCounty,
    });
  }

  if (dependent.ward) {
    addressExtensions.push({
      url: 'https://ts.kenya-hie.health/fhir/StructureDefinition/patients-ward',
      valueString: dependent.ward,
    });
  }

  if (dependent.village) {
    addressExtensions.push({
      url: 'https://ts.kenya-hie.health/fhir/StructureDefinition/patients-village_estate',
      valueString: dependent.village,
    });
  }

  const address: HIEContact['address'] = {
    extension: addressExtensions.length > 0 ? addressExtensions : undefined,
    city: dependent.county || 'NAIROBI',
    country: 'Kenya',
  };

  const relationship: HIEContact['relationship'] = [
    {
      coding: [
        {
          system: 'https://ts.kenya-hie.health/Codesystem/relationship-types',
          code: dependent.relationship.toLowerCase(),
          display: dependent.relationship,
        },
      ],
    },
  ];

  const dependentInfo: HIEContact = {
    id: dependent.id,
    extension: extensions.length > 0 ? extensions : undefined,
    relationship: relationship,
    name: name,
    telecom: telecom.length > 0 ? telecom : undefined,
    address: address,
    gender: dependent.gender.toLowerCase(),
  };

  return {
    name: dependent.name,
    relationship: dependent.relationship,
    gender: dependent.gender,
    dependentInfo,
  };
};

/**
 * Extracts all dependent contacts from a given HIE bundle.
 *
 * @param {HIEBundleResponse} bundle - HIE bundle to extract dependent contacts from
 * @returns {HIEContact[]} list of dependent contacts in the bundle, or an empty array if none found
 */
const extractDependentsFromHIEBundle = (bundle: HIEBundleResponse): HIEContact[] => {
  if (!bundle.entry || bundle.entry.length === 0) {
    return [];
  }

  const patient = bundle.entry[0].resource;
  return patient.contact || [];
};

/**
 * Finds a dependent contact in the given HIE bundle by the given dependent ID.
 *
 * @param {HIEBundleResponse} bundle - HIE bundle to search for dependent contact
 * @param {string} dependentId - ID of the dependent contact to find
 * @returns {HIEContact | undefined} dependent contact matching the given ID, or undefined if not found
 */
export const findDependentById = (bundle: HIEBundleResponse, dependentId: string): HIEContact | undefined => {
  const dependents = extractDependentsFromHIEBundle(bundle);
  return dependents.find((dependent) => dependent.id === dependentId);
};

/**
 * Returns the first patient resource in the given HIE bundle.
 *
 * @param {HIEBundleResponse} bundle - HIE bundle to extract patient from
 * @returns {HIEPatient | undefined} first patient resource in the bundle, or undefined if none found
 */
export const getPatientFromHIEBundle = (bundle: HIEBundleResponse): HIEPatient | undefined => {
  if (!bundle.entry || bundle.entry.length === 0) {
    return undefined;
  }

  return bundle.entry[0].resource;
};

/**
 * Finds and returns the value of the first identifier with the given identifier type.
 *
 * @param {HIEPatient['identifier']} identifiers - Array of identifiers to search
 * @param {string} identifierType - Identifier type to search for
 * @returns {string | undefined} value of the matched identifier, or undefined if none found
 */
export const getIdentifierValue = (
  identifiers: HIEPatient['identifier'],
  identifierType: string,
): string | undefined => {
  const identifier = identifiers.find((id) => id.type.coding.some((coding) => coding.code === identifierType));
  return identifier?.value;
};

/**
 * Finds and returns the value of an extension with the given URL
 *
 * @param {HIEContact['extension'] | HIEPatient['extension']} extensions - Extensions to search
 * @param {string} url - URL of the extension to find
 * @returns {string | undefined} valueString of the matched extension, or undefined if none found
 */
export const getExtensionValue = (
  extensions: HIEContact['extension'] | HIEPatient['extension'],
  url: string,
): string | undefined => {
  const extension = extensions?.find((ext) => ext.url === url);
  return extension?.valueString;
};

/**
 * Generates a new identifier for the given identifier source.
 *
 * @param {string} source - Identifier source to generate identifier for
 * @returns {Promise<FetchResponse>} Promise that resolves with the generated identifier, or rejects with an error
 */
export function generateIdentifier(source: string) {
  const abortController = new AbortController();

  return openmrsFetch(`${restBaseUrl}/idgen/identifiersource/${source}/identifier`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: {},
    signal: abortController.signal,
  });
}

/**
 * Checks if the given patient has dependents.
 *
 * @param {fhir.Patient} patient - The patient to check
 * @returns {boolean} true if the patient has dependents, false otherwise
 */
export const hasDependents = (patient: fhir.Patient): boolean => {
  return patient?.contact && Array.isArray(patient.contact) && patient.contact.length > 0;
};

const PHONE_ATTRIBUTE_DISPLAY_PATTERN = /phone|mobile|telephone/i;

export const getLocalPatientPhone = (localPatient: any): string | undefined => {
  const phoneAttribute = localPatient?.attributes?.find((attribute: any) =>
    PHONE_ATTRIBUTE_DISPLAY_PATTERN.test(attribute?.attributeType?.display || ''),
  );
  return phoneAttribute?.value?.trim() || undefined;
};

export const getPhoneFromFhirPatient = (patient?: fhir.Patient): string | undefined =>
  patient?.telecom?.find((contact) => contact.system === 'phone' || contact.use === 'mobile')?.value?.trim() ||
  undefined;

/**
 * Converts a local patient object to a FHIR Patient resource.
 *
 * @param {Object} localPatient - The local patient object to convert
 * @returns {fhir.Patient} The equivalent FHIR Patient resource
 */
export const convertLocalPatientToFHIR = (localPatient: any): fhir.Patient => {
  const phone = getLocalPatientPhone(localPatient);
  return {
    resourceType: 'Patient',
    id: localPatient.uuid,
    identifier:
      localPatient.identifiers?.map((id: any) => ({
        value: id.identifier,
        type: {
          coding: [
            {
              display: id.identifierType?.display || '',
              code: id.identifierType?.uuid || '',
            },
          ],
        },
      })) || [],
    name: [
      {
        text: localPatient.person?.personName?.display || '',
        given: [localPatient.person?.personName?.givenName, localPatient.person?.personName?.middleName].filter(
          Boolean,
        ),
        family: localPatient.person?.personName?.familyName || '',
      },
    ],
    telecom: phone ? [{ system: 'phone', value: phone }] : undefined,
    gender: localPatient.person?.gender?.toLowerCase() as 'male' | 'female' | 'other' | 'unknown',
    birthDate: localPatient.person?.birthdate ? localPatient.person.birthdate.split('T')[0] : undefined,
  };
};

const normalizeForComparison = (value?: string): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const normalizeDate = (value?: string): string => {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  const match = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) {
    return match[0];
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? trimmed : parsed.toISOString().slice(0, 10);
};

const tokenizeName = (value?: string): string[] => normalizeForComparison(value).split(' ').filter(Boolean);

const normalizeGender = (value?: string): string => normalizeForComparison(value).charAt(0);

const normalizePhone = (value?: string): string => {
  const digits = (value || '').replace(/\D/g, '');
  return digits.length > 9 ? digits.slice(-9) : digits;
};

/**
 * Checks whether a local patient's demographics (name, gender, birth date) differ from
 * the corresponding HIE patient record for the same national ID. Used to flag cases where
 * a patient is already registered locally but their record is out of sync with the HIE,
 * so the discrepancy can be surfaced before the registrar proceeds.
 *
 * @param {fhir.Patient} localPatient - The local patient, converted to FHIR shape.
 * @param {fhir.Patient} hiePatient - The matching HIE patient record.
 * @returns {boolean} true if the two records have differing name, gender, or birth date.
 */
export const hasDemographicMismatch = (localPatient: fhir.Patient, hiePatient: fhir.Patient): boolean =>
  getDemographicDifferences(localPatient, hiePatient).length > 0;

export interface DemographicDifference {
  field: 'name' | 'gender' | 'birthDate' | 'phone' | 'identifier';
  localValue: string;
  hieValue: string;
  label?: string;
}

export interface SyncableIdentifierType {
  code: string;
  typeUuid: string;
  label: string;
}

const normalizeIdentifierValue = (value?: string): string => (value || '').trim().toUpperCase();

export const getHieIdentifierValue = (patient: fhir.Patient, code: string): string | undefined =>
  patient.identifier
    ?.find((identifier) => identifier.type?.coding?.some((coding) => coding.code === code))
    ?.value?.trim() || undefined;

export const getLocalIdentifierValue = (localPatient: any, typeUuid: string): string | undefined =>
  localPatient?.identifiers
    ?.find((identifier: any) => identifier?.identifierType?.uuid === typeUuid)
    ?.identifier?.trim() || undefined;

export const getIdentifierDifferences = (
  localPatient: any,
  hiePatient: fhir.Patient,
  identifierTypes: Array<SyncableIdentifierType>,
): Array<DemographicDifference> => {
  const differences: Array<DemographicDifference> = [];

  for (const { code, typeUuid, label } of identifierTypes) {
    if (!typeUuid) {
      continue;
    }
    const hieValue = getHieIdentifierValue(hiePatient, code);
    if (!hieValue) {
      continue;
    }
    const localValue = getLocalIdentifierValue(localPatient, typeUuid);
    if (normalizeIdentifierValue(localValue) !== normalizeIdentifierValue(hieValue)) {
      differences.push({ field: 'identifier', label, localValue: localValue || '', hieValue });
    }
  }

  return differences;
};

export const formatPatientName = (patient?: fhir.Patient): string => {
  const name = patient?.name?.[0];
  if (!name) {
    return '';
  }
  const given = (name.given || []).filter(Boolean).join(' ');
  return [given, name.family].filter(Boolean).join(' ').trim() || name.text?.trim() || '';
};

export const getDemographicDifferences = (
  localPatient: fhir.Patient,
  hiePatient: fhir.Patient,
): Array<DemographicDifference> => {
  const differences: Array<DemographicDifference> = [];

  const localNameTokens = tokenizeName(formatPatientName(localPatient));
  const hieNameTokens = tokenizeName(formatPatientName(hiePatient));
  if (localNameTokens.length > 0 && hieNameTokens.length > 0) {
    const [shorter, longer] =
      localNameTokens.length <= hieNameTokens.length
        ? [localNameTokens, hieNameTokens]
        : [hieNameTokens, localNameTokens];
    const longerSet = new Set(longer);
    if (!shorter.every((token) => longerSet.has(token))) {
      differences.push({
        field: 'name',
        localValue: formatPatientName(localPatient),
        hieValue: formatPatientName(hiePatient),
      });
    }
  }

  if (
    localPatient.gender &&
    hiePatient.gender &&
    normalizeGender(localPatient.gender) !== normalizeGender(hiePatient.gender)
  ) {
    differences.push({ field: 'gender', localValue: localPatient.gender, hieValue: hiePatient.gender });
  }

  const localBirthDate = normalizeDate(localPatient.birthDate);
  const hieBirthDate = normalizeDate(hiePatient.birthDate);
  if (localBirthDate && hieBirthDate && localBirthDate !== hieBirthDate) {
    differences.push({ field: 'birthDate', localValue: localBirthDate, hieValue: hieBirthDate });
  }

  const localPhone = getPhoneFromFhirPatient(localPatient);
  const hiePhone = getPhoneFromFhirPatient(hiePatient);
  if (localPhone && hiePhone && normalizePhone(localPhone) !== normalizePhone(hiePhone)) {
    differences.push({ field: 'phone', localValue: localPhone, hieValue: hiePhone });
  }

  return differences;
};

/**
 * Checks if the given patient has an identifier with type 'sha-number' or 'SHA Number'
 * or if the identifier value starts with 'CR', 'SHA', or 'BY'.
 *
 * @param {fhir.Patient} patient - The patient to check
 * @returns {boolean} true if the patient has a CR or SHA number, false otherwise
 */
export const hasCROrSHANumber = (patient: fhir.Patient): boolean => {
  return (
    patient.identifier?.some(
      (identifier) =>
        identifier.type?.coding?.[0]?.code === 'sha-number' ||
        identifier.type?.coding?.[0]?.display === 'SHA Number' ||
        identifier.type?.coding?.[0]?.code === 'sha-id-number' ||
        identifier.value?.startsWith('CR') ||
        identifier.value?.startsWith('SHA') ||
        identifier.value?.startsWith('BY'),
    ) || false
  );
};

/**
 * Returns an array of tags indicating the patient's eligibility status for various insurance schemes.
 * Format: scheme(name) | eligibility status | eligibility end date | eligibility type flag
 *
 * Display Rules:
 * - scheme: UHC, SHIF, TSC, POMSF
 * - eligibility status: Eligible or Not Eligible (based on coverage.status and date validation)
 * - eligibility end date: coverage.endDate formatted as "dd MMM yyyy"
 * - eligibility type flag: Primary or Beneficiary (based on memberType)
 * - If coverage.status = "0" for both PRIMARY and BENEFICIARY → Not Eligible
 *
 * @param {fhir.Patient} patient - The patient to check eligibility status for
 * @param {EligibilityResponse} [eligibilityData] - The eligibility response data from the HIE API
 * @returns {Array<{ text: string; type: 'red' | 'green' | 'blue' | 'purple' | 'teal' }>}
 */
export const getEligibilityTags = (patient: fhir.Patient, eligibilityData?: EligibilityResponse) => {
  const tags: Array<{ text: string; type: 'red' | 'green' | 'blue' | 'purple' | 'teal' }> = [];

  const eligibilityStatus = getEligibilityStatus(eligibilityData);

  if (!eligibilityStatus) {
    return tags;
  }

  const { schemes } = eligibilityStatus;

  if (!schemes || schemes.length === 0) {
    return tags;
  }

  const formatDate = (dateString: string): string => {
    try {
      const date = parseISO(dateString);
      return format(date, 'dd MMM yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const getSchemeDisplayInfo = (
    schemeName: string,
  ): { scheme: Scheme | null; eligible: boolean; memberType: string } => {
    const schemeMatches = schemes.filter((s: Scheme) => s.schemeName.toUpperCase() === schemeName.toUpperCase());

    if (schemeMatches.length === 0) {
      return { scheme: null, eligible: false, memberType: 'N/A' };
    }

    const primaryScheme = schemeMatches.find((s: Scheme) => s.memberType === 'PRIMARY');
    if (primaryScheme && isSchemeEligibleAndActive(primaryScheme)) {
      return { scheme: primaryScheme, eligible: true, memberType: 'Primary' };
    }

    const beneficiaryScheme = schemeMatches.find((s: Scheme) => s.memberType === 'BENEFICIARY');
    if (beneficiaryScheme && isSchemeEligibleAndActive(beneficiaryScheme)) {
      return { scheme: beneficiaryScheme, eligible: true, memberType: 'Beneficiary' };
    }

    return { scheme: schemeMatches[0], eligible: false, memberType: 'N/A' };
  };

  const uhcInfo = getSchemeDisplayInfo('UHC');
  if (uhcInfo.scheme) {
    const status = uhcInfo.eligible ? 'Eligible' : 'Not Eligible';
    const endDate = uhcInfo.scheme.coverage.endDate ? formatDate(uhcInfo.scheme.coverage.endDate) : 'N/A';
    const typeFlag = uhcInfo.memberType;

    tags.push({
      text: `UHC | ${status} | ${endDate} | ${typeFlag}`,
      type: uhcInfo.eligible ? 'green' : 'red',
    });
  }

  const shifInfo = getSchemeDisplayInfo('SHIF');
  if (shifInfo.scheme) {
    const status = shifInfo.eligible ? 'Eligible' : 'Not Eligible';
    const endDate = shifInfo.scheme.coverage.endDate ? formatDate(shifInfo.scheme.coverage.endDate) : 'N/A';
    const typeFlag = shifInfo.memberType;

    tags.push({
      text: `SHIF | ${status} | ${endDate} | ${typeFlag}`,
      type: shifInfo.eligible ? 'blue' : 'red',
    });
  }

  const tscInfo = getSchemeDisplayInfo('TSC');
  if (tscInfo.scheme) {
    const status = tscInfo.eligible ? 'Eligible' : 'Not Eligible';
    const endDate = tscInfo.scheme.coverage.endDate ? formatDate(tscInfo.scheme.coverage.endDate) : 'N/A';
    const typeFlag = tscInfo.memberType;

    tags.push({
      text: `TSC | ${status} | ${endDate} | ${typeFlag}`,
      type: tscInfo.eligible ? 'purple' : 'red',
    });
  }

  const pomsfInfo = getSchemeDisplayInfo('POMSF');
  if (pomsfInfo.scheme) {
    const status = pomsfInfo.eligible ? 'Eligible' : 'Not Eligible';
    const endDate = pomsfInfo.scheme.coverage.endDate ? formatDate(pomsfInfo.scheme.coverage.endDate) : 'N/A';
    const typeFlag = pomsfInfo.memberType;

    tags.push({
      text: `POMSF | ${status} | ${endDate} | ${typeFlag}`,
      type: pomsfInfo.eligible ? 'purple' : 'red',
    });
  }

  return tags;
};

export const sanitizeName = (name: string): string => {
  return name?.trim().replace(/[^\w\s'\-\.]/g, '') || '';
};

/** Normalizes either side of the search results (local or HIE) into a search subject. */
export const toSearchSubject = (
  patient: fhir.Patient,
  source: RegistrationSearchSubject['source'],
  nationalIdUUID?: string,
  hiePatient?: fhir.Patient,
): RegistrationSearchSubject => ({
  id: patient.id!,
  source,
  patient,
  hiePatient,
  name: getPatientName(patient),
  gender: patient.gender,
  birthDate: patient.birthDate,
  nationalId: getNationalIdFromPatient(patient, nationalIdUUID),
  phoneNumber: getPhoneFromFhirPatient(patient) ?? null,
});
