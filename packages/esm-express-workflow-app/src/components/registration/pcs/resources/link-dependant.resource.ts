import { getSessionLocation, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { createPatient } from '../../dependants/dependants.resource';
import { openmrsId, openmrsIdSource } from '../../constant';
import { generateIdentifier, getLocalIdentifierValue, sanitizeName, transformToDependentPayload } from '../../helper';
import { findExistingLocalPatient } from '../../search-bar/search-bar.resource';
import useSWR from 'swr';
import { getPrimaryContact } from './pcs.resource';
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

/**
 * Which of the mother's HIE dependants are already linked to a PCS participant, keyed by
 * candidate id, with the study ID each one holds.
 *
 * One SWR key over all candidates rather than a hook per row: Carbon's `RadioButtonGroup`
 * clones its children expecting `RadioButton` elements, so a per-row wrapper component would
 * break its `valueSelected` / `onChange` wiring.
 */
export function useHieDependantLinkState(candidates: Array<any>, identifierTypes: Array<string>) {
  const key = candidates.length
    ? `pcs-hie-dependant-link-state/${candidates.map((candidate) => candidate.id).join(',')}`
    : null;

  const { data, isLoading } = useSWR(key, async () => {
    const resolved = await Promise.all(
      candidates.map(async (candidate) => {
        const localPatient = await findExistingLocalPatient(candidate.contactData, true).catch(() => null);
        const studyId = identifierTypes
          .filter(Boolean)
          .map((identifierType) => getLocalIdentifierValue(localPatient, identifierType))
          .find(Boolean);

        return [candidate.id, studyId] as const;
      }),
    );

    return Object.fromEntries(resolved) as Record<string, string | undefined>;
  });

  return { linkedById: data ?? {}, isChecking: isLoading };
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
export interface PcsDependantDemographics {
  firstName: string;
  middleName?: string;
  lastName: string;
  sex: 'M' | 'F';
  /** ISO date, `yyyy-MM-dd`. */
  dateOfBirth?: string;
  nationalId?: string;
  phone?: string;
}

/**
 * Registers a patient from plain demographics.
 *
 * `createPatient` in `dependants.resource.ts` can't serve this: its `hie-patient` branch always
 * pushes a CR-number identifier we don't have, and its `dependent` branch expects an HIE contact
 * with extensions. Posting directly here also keeps the shared `dependants/` module untouched.
 */
async function createPatientFromDemographics(
  demographics: PcsDependantDemographics,
  nationalIdUUID: string,
  phoneAttributeTypeUUID: string,
) {
  const [generated, location] = await Promise.all([generateIdentifier(openmrsIdSource), getSessionLocation()]);

  const identifiers = [
    {
      identifier: generated?.data?.identifier,
      identifierType: openmrsId,
      location: location?.uuid,
      preferred: true,
    },
  ];

  // Carrying the national ID forward is what lets `findExistingLocalPatient` match this child
  // later — and makes OpenMRS reject the create if they are already registered, rather than
  // silently producing a duplicate.
  if (demographics.nationalId) {
    identifiers.push({
      identifier: demographics.nationalId,
      identifierType: nationalIdUUID,
      location: location?.uuid,
      preferred: false,
    });
  }

  // Written as given, matching `createPatient`, which stores the HIE value unmodified.
  const attributes = demographics.phone ? [{ attributeType: phoneAttributeTypeUUID, value: demographics.phone }] : [];

  const { data } = await openmrsFetch<{ uuid: string }>(`${restBaseUrl}/patient`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
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
        addresses: [{ address1: '', cityVillage: '', country: '', postalCode: '', stateProvince: '' }],
        attributes,
      },
      identifiers,
    },
  });

  return data;
}

/** A PCS participant mapped onto the same create. */
function createPatientFromParticipant(
  participant: PcsParticipant,
  nationalIdUUID: string,
  phoneAttributeTypeUUID: string,
) {
  const contact = getPrimaryContact(participant);

  return createPatientFromDemographics(
    {
      firstName: participant.firstName,
      middleName: participant.middleName,
      lastName: participant.lastName,
      sex: participant.sex,
      dateOfBirth: participant.dateOfBirth,
      nationalId: contact?.nationalId,
      phone: contact?.phone,
    },
    nationalIdUUID,
    phoneAttributeTypeUUID,
  );
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

interface CreatePcsParticipantOptions {
  patientUuid: string;
  motherId: string;
}

/**
 * The request as the module documents it. Kept real and separately testable so the path and
 * both field names are pinned rather than discovered at integration time — the same split the
 * search side uses with `buildParticipantSearchUrl`.
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
 * Documented failures, all of which surface through the form's notification rather than
 * indicating a bug here: `409` when the patient already holds a study or temporary identifier,
 * `400` for a missing field or an unknown patient or mother, and `503` when the PCS database is
 * unreachable.
 */
async function createPcsParticipant({ patientUuid, motherId }: CreatePcsParticipantOptions): Promise<PcsParticipant> {
  const request = buildCreateParticipantRequest({ patientUuid, motherId });
  const { data } = await openmrsFetch<PcsParticipant>(request.url, request.options);
  return data;
}

interface CreateDependantWithTemporaryIdOptions {
  demographics: PcsDependantDemographics;
  motherIndividualId: string;
  nationalIdUUID: string;
  phoneAttributeTypeUUID: string;
}

/**
 * For an infant in neither PCS nor the HIE: register them here, then have the module create a
 * participant against their mother's and mint a temporary study id.
 *
 * Nothing is written client-side. The module owns both sides — it assigns the identifier and
 * sets the `PBIDS Enrolled` / `CARDSE Enrolled` attributes to match the PCS row, which the docs
 * are explicit must stay in step. The re-read is how we see what it wrote; the record we just
 * created could not carry it.
 */
export async function createDependantWithTemporaryId({
  demographics,
  motherIndividualId,
  nationalIdUUID,
  phoneAttributeTypeUUID,
}: CreateDependantWithTemporaryIdOptions) {
  const localPatient = await createPatientFromDemographics(demographics, nationalIdUUID, phoneAttributeTypeUUID);

  if (!localPatient?.uuid) {
    throw new Error('The patient record could not be created');
  }

  const participant = await createPcsParticipant({ patientUuid: localPatient.uuid, motherId: motherIndividualId });

  const updated = (await readLocalPatient(localPatient.uuid).catch(() => null)) ?? localPatient;

  await launchCheckInWorkspace(updated, updated.uuid);

  return { localPatient: updated, participant };
}
