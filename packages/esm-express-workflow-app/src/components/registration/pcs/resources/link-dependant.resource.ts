import { createPatient } from '../../dependants/dependants.resource';
import { transformToDependentPayload } from '../../helper';
import { findExistingLocalPatient } from '../../search-bar/search-bar.resource';
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
