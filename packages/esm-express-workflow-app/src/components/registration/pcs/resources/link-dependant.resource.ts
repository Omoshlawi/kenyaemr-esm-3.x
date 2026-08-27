import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { createPatient } from '../../dependants/dependants.resource';
import { transformToDependentPayload } from '../../helper';
import { findExistingLocalPatient } from '../../search-bar/search-bar.resource';
import { launchCheckInWorkspace, stampAndCheckIn } from './link-participant.resource';
import { getMockTemporaryStudyId } from './pcs-mock-data';
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

/** Artificial latency, matching the other stubbed PCS calls. */
const MOCK_LATENCY_MS = 900;

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

interface TemporaryStudyIdOptions {
  motherIndividualId: string;
  patientUuid: string;
}

/**
 * TODO(pbids-api): the path and payload field names are not settled yet. The endpoint takes
 * the mother's study ID and the patient uuid, generates a temporary study participant ID and
 * assigns it to the patient server-side. Once it exists, replace the two lines below with:
 *
 *   const { data } = await openmrsFetch<{ identifier?: string }>(
 *     `${restBaseUrl}/pbids-participants/temporary-id`,
 *     { method: 'POST', headers: { 'Content-Type': 'application/json' },
 *       body: { motherIndividualId, patientUuid } },
 *   );
 *   return data?.identifier;
 */
async function requestTemporaryStudyId({
  motherIndividualId,
  patientUuid,
}: TemporaryStudyIdOptions): Promise<string | undefined> {
  await sleep(MOCK_LATENCY_MS);
  return getMockTemporaryStudyId(`${motherIndividualId}|${patientUuid}`);
}

interface AssignTemporaryStudyIdOptions {
  dependant: LinkDependantOptions['dependant'];
  parentPhoneNumber?: string;
  motherIndividualId: string;
  t: LinkDependantOptions['t'];
}

/**
 * For a dependant PCS does not know yet: resolve them locally, then have the registry issue a
 * temporary study participant ID against their mother's.
 *
 * No identifier or attribute is written here — the endpoint assigns the identifier itself, and
 * with no PCS record the two enrolment flags are unknown, so leaving them absent says
 * "unknown" rather than asserting `false`.
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

  const temporaryId = await requestTemporaryStudyId({ motherIndividualId, patientUuid: localPatient.uuid });

  await launchCheckInWorkspace(localPatient, localPatient.uuid);

  return { localPatient, temporaryId };
}
