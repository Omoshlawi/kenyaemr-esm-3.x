import { getSessionLocation, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { createPatient } from '../../dependants/dependants.resource';
import { openmrsId, openmrsIdSource } from '../../constant';
import { generateIdentifier, sanitizeName, transformToDependentPayload } from '../../helper';
import { findExistingLocalPatient } from '../../search-bar/search-bar.resource';
import { getPrimaryContact } from './pcs.resource';
import { stampAndCheckIn } from './link-participant.resource';
import { type PcsParticipant } from '../pcs.types';

interface LinkDependantOptions {
  /** A row from `getDependentsFromContacts` — an HIE contact, not necessarily a patient here yet. */
  dependant: any;
  parentPhoneNumber?: string;
  participant: PcsParticipant;
  studyParticipantIdentifierType: string;
  pbidsEnrollmentAttributeType: string;
  cardseEnrollmentAttributeType: string;
  t: (key: string, fallback: string) => string;
}

/**
 * Resolves a dependant to a local record, creating them when they are not registered here.
 *
 * `isDependent: true` matters — it makes `extractPatientIdentifiers` skip `household-number`,
 * which belongs to the parent, so a miss here doesn't silently match the parent's own record.
 *
 * Deliberately calls `createPatient` rather than `createDependentPatient`: the latter launches
 * the visit workspace inside itself, which would fire before the study data is written.
 */
async function resolveLocalDependant(
  dependant: LinkDependantOptions['dependant'],
  parentPhoneNumber: string | undefined,
  t: LinkDependantOptions['t'],
) {
  const existing = await findExistingLocalPatient(dependant.contactData, true);
  if (existing) {
    return existing;
  }

  const payload = transformToDependentPayload(dependant);

  return createPatient(
    {
      name: payload.name,
      gender: payload.gender,
      patientData: payload.dependentInfo,
      type: 'dependent',
      parentPhoneNumber,
    },
    t,
  );
}

/**
 * Links a dependant in the HIE dependants table to a participant from their mother's PCS
 * record: create if needed, stamp the study identifier and both enrolment attributes, check in.
 */
export async function linkDependantToParticipant({
  dependant,
  parentPhoneNumber,
  participant,
  studyParticipantIdentifierType,
  pbidsEnrollmentAttributeType,
  cardseEnrollmentAttributeType,
  t,
}: LinkDependantOptions) {
  const localPatient = await resolveLocalDependant(dependant, parentPhoneNumber, t);

  return stampAndCheckIn({
    localPatient,
    participant,
    studyParticipantIdentifierType,
    pbidsEnrollmentAttributeType,
    cardseEnrollmentAttributeType,
  });
}

interface CreateAndLinkOptions {
  participant: PcsParticipant;
  nationalIdUUID: string;
  phoneAttributeTypeUUID: string;
  studyParticipantIdentifierType: string;
  pbidsEnrollmentAttributeType: string;
  cardseEnrollmentAttributeType: string;
}

/**
 * Registers a patient from a PCS participant's own demographics.
 *
 * `createPatient` in `dependants.resource.ts` can't serve this: its `hie-patient` branch always
 * pushes a CR-number identifier we don't have, and its `dependent` branch expects an HIE contact
 * with extensions. Posting directly here also keeps the shared `dependants/` module untouched.
 */
async function createPatientFromParticipant(
  participant: PcsParticipant,
  nationalIdUUID: string,
  phoneAttributeTypeUUID: string,
) {
  const [generated, location] = await Promise.all([generateIdentifier(openmrsIdSource), getSessionLocation()]);

  // Carrying the national ID forward is what lets `findExistingLocalPatient` match this child
  // later — and makes OpenMRS reject the create if they are already registered, rather than
  // silently producing a duplicate.
  const contact = getPrimaryContact(participant);

  const identifiers = [
    {
      identifier: generated?.data?.identifier,
      identifierType: openmrsId,
      location: location?.uuid,
      preferred: true,
    },
  ];

  if (contact?.nationalId) {
    identifiers.push({
      identifier: contact.nationalId,
      identifierType: nationalIdUUID,
      location: location?.uuid,
      preferred: false,
    });
  }

  // Written as PCS reports it, matching `createPatient`, which stores the HIE value unmodified.
  const attributes = contact?.phone ? [{ attributeType: phoneAttributeTypeUUID, value: contact.phone }] : [];

  const { data } = await openmrsFetch<{ uuid: string }>(`${restBaseUrl}/patient`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      person: {
        names: [
          {
            preferred: true,
            givenName: sanitizeName(participant.firstName) || 'Unknown',
            middleName: sanitizeName(participant.middleName ?? '') || '',
            familyName: sanitizeName(participant.lastName) || 'Unknown',
          },
        ],
        gender: participant.sex,
        birthdate: participant.dateOfBirth ?? null,
        birthdateEstimated: !participant.dateOfBirth,
        addresses: [{ address1: '', cityVillage: '', country: '', postalCode: '', stateProvince: '' }],
        attributes,
      },
      identifiers,
    },
  });

  return data;
}

/**
 * For a PCS dependant the HIE has no record of: build the patient from PCS's own demographics,
 * then stamp **this participant's** identifier — they already hold a permanent one, so nothing
 * temporary is minted and PCS keeps a single record for the child.
 */
export async function createAndLinkFromParticipant({
  participant,
  nationalIdUUID,
  phoneAttributeTypeUUID,
  studyParticipantIdentifierType,
  pbidsEnrollmentAttributeType,
  cardseEnrollmentAttributeType,
}: CreateAndLinkOptions) {
  const localPatient = await createPatientFromParticipant(participant, nationalIdUUID, phoneAttributeTypeUUID);

  return stampAndCheckIn({
    localPatient,
    participant,
    studyParticipantIdentifierType,
    pbidsEnrollmentAttributeType,
    cardseEnrollmentAttributeType,
  });
}
