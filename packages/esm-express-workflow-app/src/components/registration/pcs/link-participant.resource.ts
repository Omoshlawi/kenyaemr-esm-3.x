import {
  getSessionLocation,
  launchWorkspace2,
  launchWorkspaceGroup2,
  openmrsFetch,
  restBaseUrl,
  type Visit,
} from '@openmrs/esm-framework';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { createPatient } from '../dependants/dependants.resource';
import { getLocalIdentifierValue } from '../helper';
import { findExistingLocalPatient } from '../search-bar/search-bar.resource';
import { type VisitFormProps } from '../start-visit-form/visit-form-workspace/visit-form.workspace';
import { formatParticipantName } from './pcs.resource';
import { type PcsParticipant, type PcsSearchSubject } from './pcs.types';

const PATIENT_REPRESENTATION =
  'custom:(patientId,uuid,identifiers,display,patientIdentifier:(uuid,identifier),person:(gender,age,birthdate,birthdateEstimated,personName,addresses,display,dead,deathDate),attributes:(value,attributeType:(uuid,display)))';

/**
 * Both attribute types are `java.lang.Boolean` format. OpenMRS stores `person_attribute.value`
 * as a string column and hydrates them with `Boolean.valueOf(value)`, so "true"/"false"
 * round-trip exactly — and the unchanged-value check in `writePersonAttribute` stays a plain
 * string compare.
 */
const toAttributeValue = (flag: boolean) => String(Boolean(flag));

interface LinkParticipantOptions {
  subject: PcsSearchSubject;
  participant: PcsParticipant;
  studyParticipantIdentifierType: string;
  pbidsEnrollmentAttributeType: string;
  cardseEnrollmentAttributeType: string;
  t: (key: string, fallback: string) => string;
}

/** Read-only: the local record behind this subject, or null when they are not registered here. */
export async function findLocalPatientForSubject(subject: PcsSearchSubject) {
  if (subject.source === 'local') {
    const { data } = await openmrsFetch(`${restBaseUrl}/patient/${subject.id}?v=${PATIENT_REPRESENTATION}`);
    return data;
  }

  return findExistingLocalPatient(subject.patient, false);
}

/**
 * Resolves the authorized patient to a local OpenMRS record, creating them when the search
 * came from the HIE and they are not registered here yet.
 *
 * Deliberately composed from `findLocalPatientForSubject` + `createPatient` rather than
 * `registerOrLaunchHIEPatient`: that helper launches the visit workspace inside its create
 * branch, which would fire before the study data is written.
 */
async function resolveLocalPatient(subject: PcsSearchSubject, t: LinkParticipantOptions['t']) {
  const existing = await findLocalPatientForSubject(subject);
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

/**
 * Whether this patient already carries a study participant ID. Having one means we hold a
 * unique key into PCS, so the pane reports on that participant instead of searching.
 */
export function usePatientStudyLink(subject: PcsSearchSubject, studyParticipantIdentifierType: string) {
  const key = `pcs-study-link/${subject.id}/${studyParticipantIdentifierType}`;

  const { data, isLoading, error, mutate } = useSWR(key, () => findLocalPatientForSubject(subject), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  return {
    localPatient: data ?? null,
    studyParticipantId: getLocalIdentifierValue(data, studyParticipantIdentifierType),
    isLoading,
    error,
    mutate,
  };
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

/**
 * Reads the person's attributes first so an existing one is updated rather than stacked.
 * Returns whether anything was actually written — the background sync uses that to report
 * what it corrected.
 */
async function writePersonAttribute(personUuid: string, attributeType: string, value: string): Promise<boolean> {
  const response = await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute?v=default`);
  const attributes: Array<any> = response?.data?.results ?? [];
  const existing = attributes.find((attribute) => attribute.attributeType?.uuid === attributeType && !attribute.voided);

  if (existing) {
    if (existing.value === value) {
      return false;
    }
    await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute/${existing.uuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { value },
    });
    return true;
  }

  await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { attributeType, value },
  });
  return true;
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
  pbidsEnrollmentAttributeType,
  cardseEnrollmentAttributeType,
  t,
}: LinkParticipantOptions) {
  const localPatient = await resolveLocalPatient(subject, t);

  if (!localPatient?.uuid) {
    throw new Error(`Could not resolve a local patient record for ${formatParticipantName(participant)}`);
  }

  await writeStudyIdentifier(localPatient, studyParticipantIdentifierType, participant.individualId);
  await writePersonAttribute(
    localPatient.uuid,
    pbidsEnrollmentAttributeType,
    toAttributeValue(participant.pbidsEnrolled),
  );
  await writePersonAttribute(localPatient.uuid, cardseEnrollmentAttributeType, toAttributeValue(participant.cardse));

  await launchCheckInWorkspace(localPatient, localPatient.uuid);

  return localPatient;
}

interface DelinkParticipantOptions {
  localPatient: any;
  studyParticipantIdentifierType: string;
  pbidsEnrollmentAttributeType: string;
  cardseEnrollmentAttributeType: string;
}

/**
 * Removes the study data from a patient: the participant identifier and both attributes.
 * OpenMRS voids rather than hard-deletes these, so the history survives.
 *
 * Anything already absent is skipped rather than treated as an error — a patient left
 * half-written by a failed link must still be delinkable.
 */
export async function delinkParticipant({
  localPatient,
  studyParticipantIdentifierType,
  pbidsEnrollmentAttributeType,
  cardseEnrollmentAttributeType,
}: DelinkParticipantOptions) {
  const personUuid = localPatient?.uuid;

  if (!personUuid) {
    throw new Error('Could not resolve a local patient record to delink');
  }

  const identifier = localPatient?.identifiers?.find(
    (candidate: any) => candidate.identifierType?.uuid === studyParticipantIdentifierType && !candidate.voided,
  );

  if (identifier) {
    await openmrsFetch(`${restBaseUrl}/patient/${personUuid}/identifier/${identifier.uuid}`, { method: 'DELETE' });
  }

  const response = await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute?v=default`);
  const attributes: Array<any> = response?.data?.results ?? [];

  for (const attributeType of [pbidsEnrollmentAttributeType, cardseEnrollmentAttributeType]) {
    const attribute = attributes.find(
      (candidate) => candidate.attributeType?.uuid === attributeType && !candidate.voided,
    );
    if (attribute) {
      await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute/${attribute.uuid}`, { method: 'DELETE' });
    }
  }
}

/** Which of the two enrolment flags a sync actually corrected. */
export type StudyAttributeFlag = 'pbids' | 'cardse';

interface SyncStudyAttributesOptions {
  personUuid: string;
  participant: PcsParticipant;
  pbidsEnrollmentAttributeType: string;
  cardseEnrollmentAttributeType: string;
}

/**
 * Brings the patient's two enrolment attributes in line with what PCS currently reports.
 * PCS owns these flags, so its values win over whatever is on the patient.
 *
 * Returns the flags that were actually written; an already-in-sync patient costs one read
 * and no writes, because `writePersonAttribute` short-circuits on an unchanged value.
 */
export async function syncStudyAttributes({
  personUuid,
  participant,
  pbidsEnrollmentAttributeType,
  cardseEnrollmentAttributeType,
}: SyncStudyAttributesOptions): Promise<Array<StudyAttributeFlag>> {
  const changed: Array<StudyAttributeFlag> = [];

  if (
    await writePersonAttribute(personUuid, pbidsEnrollmentAttributeType, toAttributeValue(participant.pbidsEnrolled))
  ) {
    changed.push('pbids');
  }
  if (await writePersonAttribute(personUuid, cardseEnrollmentAttributeType, toAttributeValue(participant.cardse))) {
    changed.push('cardse');
  }

  return changed;
}

interface UseSyncStudyAttributesOptions {
  participant: PcsParticipant | null;
  localPatient: any;
  pbidsEnrollmentAttributeType: string;
  cardseEnrollmentAttributeType: string;
  onSynced?: (changed: Array<StudyAttributeFlag>) => void;
  onSyncError?: (error: unknown) => void;
}

/**
 * Syncs the enrolment attributes in the background whenever a participant is pulled by id, so
 * the patient record tracks PCS without anyone pressing anything.
 *
 * The signature ref is what keeps this to one sync per participant rather than one per render
 * — without it React 18's StrictMode double-invoke alone would double-write.
 */
export function useSyncStudyAttributes({
  participant,
  localPatient,
  pbidsEnrollmentAttributeType,
  cardseEnrollmentAttributeType,
  onSynced,
  onSyncError,
}: UseSyncStudyAttributesOptions) {
  const personUuid = localPatient?.uuid;
  const signature = participant
    ? `${personUuid}|${participant.individualId}|${participant.pbidsEnrolled}|${participant.cardse}`
    : null;

  const syncedSignature = useRef<string | null>(null);
  const [forcedAt, setForcedAt] = useState(0);

  const callbacks = useRef({ onSynced, onSyncError });
  callbacks.current = { onSynced, onSyncError };

  useEffect(() => {
    if (!participant || !personUuid || !signature) {
      return;
    }
    if (syncedSignature.current === signature) {
      return;
    }
    syncedSignature.current = signature;

    let cancelled = false;
    syncStudyAttributes({
      personUuid,
      participant,
      pbidsEnrollmentAttributeType,
      cardseEnrollmentAttributeType,
    })
      .then((changed) => {
        if (!cancelled && changed.length > 0) {
          callbacks.current.onSynced?.(changed);
        }
      })
      .catch((error) => {
        // Let the next pull retry rather than pinning the failed signature.
        syncedSignature.current = null;
        if (!cancelled) {
          callbacks.current.onSyncError?.(error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [participant, personUuid, signature, pbidsEnrollmentAttributeType, cardseEnrollmentAttributeType, forcedAt]);

  /**
   * Reconciles even when the PCS values are unchanged — the guard would otherwise suppress a
   * sync that is needed because the *patient's* attributes drifted.
   */
  const syncNow = useCallback(() => {
    syncedSignature.current = null;
    setForcedAt(Date.now());
  }, []);

  return { syncNow };
}
