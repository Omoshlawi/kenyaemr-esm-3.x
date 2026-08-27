import {
  getSessionLocation,
  launchWorkspace2,
  launchWorkspaceGroup2,
  openmrsFetch,
  restBaseUrl,
  type Visit,
} from '@openmrs/esm-framework';
import { createPatient } from '../dependants/dependants.resource';
import { findExistingLocalPatient } from '../search-bar/search-bar.resource';
import { type VisitFormProps } from '../start-visit-form/visit-form-workspace/visit-form.workspace';
import { formatParticipantName } from './pcs.resource';
import { type PcsParticipant, type PcsSearchSubject } from './pcs.types';

export const STUDY_STATUS_ENROLLED = 'Enrolled';
export const STUDY_STATUS_NOT_ENROLLED = 'Not enrolled';
export const PARTICIPANT_CATEGORY_CARDSE = 'CARDSE';
export const PARTICIPANT_CATEGORY_PBIDS = 'PBIDS';

const PATIENT_REPRESENTATION =
  'custom:(patientId,uuid,identifiers,display,patientIdentifier:(uuid,identifier),person:(gender,age,birthdate,birthdateEstimated,personName,addresses,display,dead,deathDate),attributes:(value,attributeType:(uuid,display)))';

export const getStudyStatus = (participant: PcsParticipant) =>
  participant.pbidsEnrolled ? STUDY_STATUS_ENROLLED : STUDY_STATUS_NOT_ENROLLED;

export const getParticipantCategory = (participant: PcsParticipant) =>
  participant.cardse ? PARTICIPANT_CATEGORY_CARDSE : PARTICIPANT_CATEGORY_PBIDS;

interface LinkParticipantOptions {
  subject: PcsSearchSubject;
  participant: PcsParticipant;
  studyParticipantIdentifierType: string;
  studyStatusAttributeType: string;
  participantCategoryAttributeType: string;
  t: (key: string, fallback: string) => string;
}

/**
 * Resolves the authorized patient to a local OpenMRS record, creating them when the search
 * came from the HIE and they are not registered here yet.
 *
 * Deliberately composed from `findExistingLocalPatient` + `createPatient` rather than
 * `registerOrLaunchHIEPatient`: that helper launches the visit workspace inside its create
 * branch, which would fire before the study data is written.
 */
async function resolveLocalPatient(subject: PcsSearchSubject, t: LinkParticipantOptions['t']) {
  if (subject.source === 'local') {
    const { data } = await openmrsFetch(`${restBaseUrl}/patient/${subject.id}?v=${PATIENT_REPRESENTATION}`);
    return data;
  }

  const existing = await findExistingLocalPatient(subject.patient, false);
  if (existing) {
    return existing;
  }

  return createPatient(
    {
      name: subject.name,
      gender: subject.gender ?? '',
      birthDate: subject.birthDate,
      patientData: subject.patient,
      type: 'hie-patient',
    },
    t,
  );
}

/** Updates the study identifier in place when it already exists, rather than duplicating it. */
async function writeStudyIdentifier(localPatient: any, identifierType: string, value: string) {
  const existing = localPatient?.identifiers?.find(
    (identifier: any) => identifier.identifierType?.uuid === identifierType && !identifier.voided,
  );

  if (existing) {
    if (existing.identifier !== value) {
      await openmrsFetch(`${restBaseUrl}/patient/${localPatient.uuid}/identifier/${existing.uuid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { identifier: value },
      });
    }
    return;
  }

  const sessionLocation = await getSessionLocation();
  const locationUuid =
    sessionLocation?.uuid ??
    localPatient?.identifiers?.find((identifier: any) => identifier.location?.uuid)?.location?.uuid;

  await openmrsFetch(`${restBaseUrl}/patient/${localPatient.uuid}/identifier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      identifier: value,
      identifierType,
      location: locationUuid,
      preferred: false,
    },
  });
}

/** Reads the person's attributes first so an existing one is updated rather than stacked. */
async function writePersonAttribute(personUuid: string, attributeType: string, value: string) {
  const response = await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute?v=default`);
  const attributes: Array<any> = response?.data?.results ?? [];
  const existing = attributes.find((attribute) => attribute.attributeType?.uuid === attributeType && !attribute.voided);

  if (existing) {
    if (existing.value === value) {
      return;
    }
    await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute/${existing.uuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { value },
    });
    return;
  }

  await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { attributeType, value },
  });
}

async function launchCheckInWorkspace(patient: any, patientUuid: string) {
  await launchWorkspaceGroup2('ewf-patient-chart', {
    patient,
    patientUuid,
    visitContext: null as unknown as Visit,
    mutateVisitContext: () => {},
  });

  launchWorkspace2<VisitFormProps, {}, {}>(
    'custom-start-visit-workspace-form',
    {
      openedFrom: 'registration-check-in',
      showPatientHeader: false,
    },
    {},
    null,
  );
}

/**
 * Links the authorized patient to a PCS participant: resolve (creating if needed), stamp the
 * study identifier and attributes, then check in. The workspace launches last and only once,
 * so a failed write leaves the clinician on the modal to retry rather than dropping them into
 * a visit form for a half-written record.
 */
export async function linkParticipantToPatient({
  subject,
  participant,
  studyParticipantIdentifierType,
  studyStatusAttributeType,
  participantCategoryAttributeType,
  t,
}: LinkParticipantOptions) {
  const localPatient = await resolveLocalPatient(subject, t);

  if (!localPatient?.uuid) {
    throw new Error(`Could not resolve a local patient record for ${formatParticipantName(participant)}`);
  }

  await writeStudyIdentifier(localPatient, studyParticipantIdentifierType, participant.individualId);
  await writePersonAttribute(localPatient.uuid, studyStatusAttributeType, getStudyStatus(participant));
  await writePersonAttribute(localPatient.uuid, participantCategoryAttributeType, getParticipantCategory(participant));

  await launchCheckInWorkspace(localPatient, localPatient.uuid);

  return localPatient;
}
