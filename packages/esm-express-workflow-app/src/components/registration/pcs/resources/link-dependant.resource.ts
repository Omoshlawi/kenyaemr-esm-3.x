import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { createPatient } from '../../dependants/dependants.resource';
import { transformToDependentPayload } from '../../helper';
import { findExistingLocalPatient } from '../../search-bar/search-bar.resource';
import { launchCheckInWorkspace, readLocalPatient, stampAndCheckIn } from './link-participant.resource';
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

interface CreatePcsParticipantOptions {
  patientUuid: string;
  motherId: string;
}

/**
 * The request as the module documents it. Kept real and separately testable so the path and
 * both field names are pinned now rather than discovered on the day the endpoint is deployed —
 * the same split the search side uses with `buildParticipantSearchUrl`.
 */
export function buildCreateParticipantRequest({ patientUuid, motherId }: CreatePcsParticipantOptions) {
  return {
    url: `${restBaseUrl}/pbids-participants`,
    options: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { patientUuid, motherId },
    },
  };
}

/**
 * Documented failures, all of which surface through the modal's notification rather than
 * indicating a bug here: `409` when the patient already holds a study or temporary identifier
 * (the UI hides the action for those rows, but two registrars racing would reach it), `400`
 * for a missing field or an unknown patient or mother, and `503` when the PCS database is
 * unreachable.
 */
async function createPcsParticipant({ patientUuid, motherId }: CreatePcsParticipantOptions): Promise<PcsParticipant> {
  const request = buildCreateParticipantRequest({ patientUuid, motherId });
  const { data } = await openmrsFetch<PcsParticipant>(request.url, request.options);
  return data;
}

interface AssignTemporaryStudyIdOptions {
  dependant: LinkDependantOptions['dependant'];
  parentPhoneNumber?: string;
  motherIndividualId: string;
  t: LinkDependantOptions['t'];
}

/**
 * For a dependant PCS does not know yet: resolve them locally, then have the registry create a
 * participant for them against their mother's, carrying a temporary study id.
 *
 * Nothing is written here. The module owns both sides of this — it assigns the identifier and
 * sets the `PBIDS Enrolled` / `CARDSE Enrolled` person attributes to match the PCS row, which
 * the docs are explicit must stay in step. A client-side write would be the thing that broke
 * that pairing.
 */
export async function assignTemporaryStudyId({
  dependant,
  parentPhoneNumber,
  motherIndividualId,
  t,
}: AssignTemporaryStudyIdOptions) {
  const localPatient = await resolveLocalDependant(dependant, parentPhoneNumber, t);

  if (!localPatient?.uuid) {
    throw new Error('Could not resolve a local patient record for this dependant');
  }

  const participant = await createPcsParticipant({ patientUuid: localPatient.uuid, motherId: motherIndividualId });

  // The module assigns the identifier server-side, so the record resolved above could never
  // carry it. Re-read, tolerating failure — the participant was created either way.
  const updated = (await readLocalPatient(localPatient.uuid).catch(() => null)) ?? localPatient;

  await launchCheckInWorkspace(updated, updated.uuid);

  return { localPatient: updated, participant };
}
