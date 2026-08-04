import { useCallback, useEffect, useMemo, useState } from 'react';
import { age, getPatientName, showSnackbar, toOmrsIsoString, useSession, useVisit } from '@openmrs/esm-framework';
import useSWR from 'swr';
import {
  hasInitialAssessment,
  type DialysisSummary,
  type FacilityHeader,
  type HaemodialysisSession,
  type MonitoringRow,
  type MonitoringSessionAction,
  type PatientBiodata,
  type PhysicianPrescription,
  type PostDialysisAssessment,
  type PreDialysisAssessment,
} from '../types';
import {
  appendHaemodialysisObservations,
  createHaemodialysisEncounter,
  fetchHaemodialysisEncounters,
  HAEMODIALYSIS_ENCOUNTER_REP,
} from './haemodialysis-api';
import {
  buildInitialAssessmentObs,
  buildMachineCheckObs,
  buildMonitoringObs,
  buildPostDialysisObs,
  hasEncounterInitialAssessment,
  parseEncounterToSession,
  type HaemodialysisEncounterResource,
  type HaemodialysisObsInput,
} from '../utils/encounter-mapper';
import { useHaemodialysisConfig } from '../concepts/use-haemodialysis-config';
import type { VisitDiagnosisConceptMap } from '../concepts/haemodialysis-concepts';
import { INCLUDE_ICD11_DIAGNOSIS_OBS } from '../constants/encounter-post-flags';
import type { InitialAssessmentFormValues, MachineCheckFormValues } from '../utils/validators';
import { parseMonitoringDatetime } from '../utils/monitoring-datetime';
import {
  buildDefaultSlotMinutes,
  appendExtensionHours,
  getExtensionHoursFromSchedule,
} from '../utils/monitoring-schedule';
import { getHighestFilledSlotMinute, getTimeActiveSlotIndex } from '../utils/monitoring-slots';
import { isDialysisSessionComplete } from '../utils/dialysis-session-lifecycle';

const buildFacility = (locationDisplay?: string): FacilityHeader => ({
  hospitalName: locationDisplay?.trim() || '—',
});

const buildBiodata = (patient?: fhir.Patient, patientUuid?: string): PatientBiodata => {
  const name = patient ? getPatientName(patient) : 'Unknown Patient';
  const sex = patient?.gender === 'male' ? 'Male' : patient?.gender === 'female' ? 'Female' : patient?.gender ?? '—';
  const patientAge = patient?.birthDate ? age(patient.birthDate) : '—';
  const phone = patient?.telecom?.find((t) => t.system === 'phone')?.value ?? patient?.telecom?.[0]?.value ?? '—';
  const addressLine =
    patient?.address?.[0]?.line?.join(', ') ||
    [patient?.address?.[0]?.city, patient?.address?.[0]?.state].filter(Boolean).join(', ') ||
    '—';

  const opNo =
    patient?.identifier?.find((id) => id.type?.text?.toLowerCase().includes('openmrs'))?.value ??
    patient?.identifier?.[0]?.value ??
    patientUuid?.slice(0, 8) ??
    '—';

  return {
    name,
    shaNo: '—',
    age: String(patientAge),
    contact: phone,
    diagnosis: undefined,
    opNo,
    date: undefined,
    sex,
    clinic: 'Renal Unit',
    address: addressLine,
  };
};

/** OpenMRS REST expects a colon in the timezone offset (e.g. +03:00). */
const formatDatetimeForOpenMrs = (iso: string): string => iso.replace(/(\+|-)([0-9]{2})([0-9]{2})$/, '$1$2:$3');

const toEncounterDatetime = (sessionDate: string): string => {
  const date = sessionDate?.trim() ? new Date(sessionDate) : new Date();
  if (Number.isNaN(date.getTime())) {
    return formatDatetimeForOpenMrs(toOmrsIsoString(new Date()));
  }
  const now = new Date();
  date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
  return formatDatetimeForOpenMrs(toOmrsIsoString(date));
};

const showSaveError = (message: string) => {
  showSnackbar({
    title: 'Save failed',
    subtitle: message,
    kind: 'error',
    isLowContrast: true,
  });
};

const showSaveSuccess = (subtitle: string) => {
  showSnackbar({
    title: 'Saved',
    subtitle,
    kind: 'success',
    isLowContrast: true,
  });
};

const buildEncounterForCache = (
  encounter: HaemodialysisEncounterResource,
  obs: ReturnType<typeof buildInitialAssessmentObs>,
  diagnosis: InitialAssessmentFormValues['diagnosis'],
  visitDiagnosis: VisitDiagnosisConceptMap,
): HaemodialysisEncounterResource => ({
  ...encounter,
  obs:
    encounter.obs && encounter.obs.length > 0
      ? encounter.obs
      : obs.map((item) => ({
          concept: { uuid: item.concept },
          value: item.value,
          obsDatetime: item.obsDatetime,
          groupMembers: item.groupMembers?.map((member) => {
            const isProblemMember = member.concept === visitDiagnosis.problem && diagnosis?.uuid;
            return {
              concept: { uuid: member.concept },
              value: isProblemMember ? { uuid: diagnosis.uuid, display: diagnosis.display } : member.value,
            };
          }),
        })),
  diagnoses:
    encounter.diagnoses ??
    (diagnosis?.uuid
      ? [
          {
            diagnosis: {
              coded: { uuid: diagnosis.uuid, display: diagnosis.display },
            },
          },
        ]
      : undefined),
});

const mapObsInputToEncounterObs = (item: HaemodialysisObsInput) => ({
  concept: { uuid: item.concept },
  value: item.value,
  obsDatetime: item.obsDatetime,
  groupMembers: item.groupMembers?.map((member) => ({
    concept: { uuid: member.concept },
    value: member.value,
  })),
});

const mergeObsIntoEncounterCache = (
  encounter: HaemodialysisEncounterResource,
  obs: HaemodialysisObsInput[],
): HaemodialysisEncounterResource => ({
  ...encounter,
  obs: [...(encounter.obs ?? []), ...obs.map(mapObsInputToEncounterObs)],
});

export function useHaemodialysisSession(patientUuid?: string, patient?: fhir.Patient) {
  const session = useSession();
  const { activeVisit } = useVisit(patientUuid);
  const { concepts, visitDiagnosis, encounterTypeUuid } = useHaemodialysisConfig();
  const biodataBase = useMemo(() => buildBiodata(patient, patientUuid), [patient, patientUuid]);

  const facility = useMemo(() => buildFacility(session?.sessionLocation?.display), [session?.sessionLocation?.display]);

  const swrKey = patientUuid
    ? `/ws/rest/v1/encounter?patient=${patientUuid}&encounterType=${encounterTypeUuid}&v=${HAEMODIALYSIS_ENCOUNTER_REP}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, () => fetchHaemodialysisEncounters(patientUuid!), {
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  const [sessionPatch, setSessionPatch] = useState<Partial<HaemodialysisSession>>({});
  const [isNewDialysisDraft, setIsNewDialysisDraft] = useState(false);

  const allEncounterSessions = useMemo((): HaemodialysisSession[] => {
    const encounters = data ?? [];
    return encounters
      .filter((encounter) => hasEncounterInitialAssessment(encounter, concepts, visitDiagnosis))
      .sort(
        (left, right) =>
          new Date(right.encounterDatetime ?? 0).getTime() - new Date(left.encounterDatetime ?? 0).getTime(),
      )
      .map((encounter) =>
        parseEncounterToSession(encounter, patientUuid ?? '', biodataBase, facility, concepts, visitDiagnosis),
      );
  }, [data, patientUuid, biodataBase, facility, concepts, visitDiagnosis]);

  const completedSessions = useMemo(
    () => allEncounterSessions.filter((item) => isDialysisSessionComplete(item)),
    [allEncounterSessions],
  );

  const activePersistedSession = useMemo((): HaemodialysisSession | null => {
    if (isNewDialysisDraft) {
      return null;
    }
    const inProgress = allEncounterSessions.find((item) => !isDialysisSessionComplete(item));
    if (inProgress) {
      return inProgress;
    }
    return allEncounterSessions[0] ?? null;
  }, [allEncounterSessions, isNewDialysisDraft]);

  const persistedSession = activePersistedSession;

  useEffect(() => {
    if (!sessionPatch.monitoringAction && !sessionPatch.monitoringSlotMinutes) {
      return;
    }
    const persistedAction = persistedSession?.monitoringAction;
    const patchAction = sessionPatch.monitoringAction;
    const actionSynced =
      !patchAction ||
      (persistedAction?.type === patchAction.type &&
        (patchAction.type !== 'terminated' || persistedAction?.type === 'terminated'));
    const slotsSynced =
      !sessionPatch.monitoringSlotMinutes ||
      persistedSession?.monitoringSlotMinutes?.join(',') === sessionPatch.monitoringSlotMinutes.join(',') ||
      getExtensionHoursFromSchedule(persistedSession?.monitoringSlotMinutes ?? buildDefaultSlotMinutes()) >=
        getExtensionHoursFromSchedule(sessionPatch.monitoringSlotMinutes);
    if (actionSynced && slotsSynced) {
      setSessionPatch({});
    }
  }, [persistedSession, sessionPatch]);

  const current: HaemodialysisSession = useMemo(
    () => ({
      ...(persistedSession ?? {
        patientUuid: patientUuid ?? '',
        biodata: biodataBase,
        facility,
        monitoring: [],
      }),
      ...sessionPatch,
    }),
    [persistedSession, patientUuid, biodataBase, facility, sessionPatch],
  );

  /** Every saved session (including the active one) for section history tables, with live merges from the UI session. */
  const tableSessions = useMemo((): HaemodialysisSession[] => {
    const activeUuid = current.encounterUuid;
    let sessions = allEncounterSessions.map((persisted) => {
      if (activeUuid && persisted.encounterUuid === activeUuid) {
        return { ...persisted, ...current, encounterUuid: activeUuid };
      }
      return persisted;
    });

    if (activeUuid && !sessions.some((item) => item.encounterUuid === activeUuid)) {
      sessions = [current, ...sessions];
    }

    return sessions.sort((left, right) => {
      const leftTime = left.biodata.date ? new Date(left.biodata.date).getTime() : 0;
      const rightTime = right.biodata.date ? new Date(right.biodata.date).getTime() : 0;
      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }
      return (right.encounterUuid ?? '').localeCompare(left.encounterUuid ?? '');
    });
  }, [allEncounterSessions, current]);

  const encounterUuid = persistedSession?.encounterUuid;
  const providerUuid = session?.currentProvider?.uuid;
  const locationUuid = session?.sessionLocation?.uuid;

  const saveInitialAssessment = useCallback(
    async (payload: InitialAssessmentFormValues): Promise<boolean> => {
      if (!patientUuid) {
        showSaveError('Patient is required');
        return false;
      }

      if (!activeVisit?.uuid) {
        showSaveError('Patient has no active visit. Start a visit before saving haemodialysis data.');
        return false;
      }

      if (!providerUuid) {
        showSaveError('No provider found in session. Log in as a clinical provider.');
        return false;
      }

      if (!locationUuid) {
        showSaveError('No session location found. Select a location and try again.');
        return false;
      }

      const encounterDatetime = toEncounterDatetime(payload.sessionDate);
      const obs = buildInitialAssessmentObs(
        payload.screening ?? {},
        payload.preDialysis,
        payload.prescription,
        encounterDatetime,
        payload.diagnosis,
        concepts,
        visitDiagnosis,
      );

      if (obs.length === 0) {
        showSaveError(
          'No observations to save. Enable fields in initial-obs-flags.ts after server metadata is verified.',
        );
        return false;
      }

      const diagnosisObsGroup = obs.find((item) => item.concept === visitDiagnosis.construct);
      const hasDiagnosisObs = Boolean(diagnosisObsGroup);

      if (INCLUDE_ICD11_DIAGNOSIS_OBS) {
        if (!payload.diagnosis?.uuid?.trim()) {
          showSaveError('ICD-11 diagnosis is required');
          return false;
        }
        if (!hasDiagnosisObs) {
          showSaveError(
            'Could not build diagnosis observation. Select a diagnosis from the ICD-11 search results (not free text).',
          );
          return false;
        }
      }

      const result = await createHaemodialysisEncounter(
        {
          patientUuid,
          locationUuid,
          providerUuid,
          visitUuid: activeVisit?.uuid,
          encounterDatetime,
        },
        obs,
      );

      if (!result.success) {
        showSaveError(result.message);
        return false;
      }

      await mutate(
        (existing = []) => {
          if (!result.encounter?.uuid) {
            return existing;
          }
          const savedEncounter = buildEncounterForCache(result.encounter, obs, payload.diagnosis, visitDiagnosis);
          const withoutDuplicate = existing.filter((item) => item.uuid !== savedEncounter.uuid);
          return [savedEncounter, ...withoutDuplicate];
        },
        { revalidate: true },
      );
      setIsNewDialysisDraft(false);
      setSessionPatch({});
      showSaveSuccess('Initial haemodialysis assessment saved');
      return true;
    },
    [patientUuid, locationUuid, providerUuid, activeVisit?.uuid, mutate, concepts, visitDiagnosis],
  );

  const saveMachineCheck = useCallback(
    async (payload: MachineCheckFormValues): Promise<boolean> => {
      if (!patientUuid) {
        showSaveError('Patient is required');
        return false;
      }

      if (!encounterUuid) {
        showSaveError('Save the initial assessment before recording machine checks');
        return false;
      }

      const encounterDatetime = toOmrsIsoString(new Date());
      const obs = buildMachineCheckObs(payload, encounterDatetime, concepts);

      if (obs.length === 0) {
        showSaveError(
          'No machine check observations to save. Enable fields in machine-check-obs-flags.ts after server metadata is verified.',
        );
        return false;
      }

      const result = await appendHaemodialysisObservations(encounterUuid, obs, patientUuid);

      if (!result.success) {
        showSaveError(result.message);
        return false;
      }

      await mutate(
        (existing = []) =>
          existing.map((encounter) => {
            if (encounter.uuid !== encounterUuid) {
              return encounter;
            }
            return mergeObsIntoEncounterCache(encounter, obs);
          }),
        { revalidate: true },
      );
      showSaveSuccess('Dialysis machine check saved');
      return true;
    },
    [patientUuid, encounterUuid, mutate, concepts],
  );

  const saveMonitoringSlot = useCallback(
    async (row: MonitoringRow, sessionStartIso: string): Promise<boolean> => {
      if (!patientUuid) {
        showSaveError('Patient is required');
        return false;
      }

      if (!encounterUuid) {
        showSaveError('Save the initial assessment before recording monitoring');
        return false;
      }

      if (!persistedSession?.machineCheck) {
        showSaveError('Complete dialysis machine check before recording monitoring');
        return false;
      }

      const existingRows = current.monitoring.filter((existing) => existing.slotMinute !== row.slotMinute);
      const monitoring = [...existingRows, row].sort((a, b) => a.slotMinute - b.slotMinute);
      const slotMinutes = current.monitoringSlotMinutes ?? buildDefaultSlotMinutes();
      const obs = buildMonitoringObs(
        {
          rows: monitoring,
          sessionStartIso,
          slotMinutes,
          action: current.monitoringAction?.type === 'terminated' ? current.monitoringAction : undefined,
        },
        concepts,
      );

      if (obs.length === 0) {
        showSaveError(
          'No monitoring observations to save. Enable monitoring-obs-flags.ts or verify Post HD Nurse Notes concept on the server.',
        );
        return false;
      }

      const result = await appendHaemodialysisObservations(encounterUuid, obs, patientUuid);

      if (!result.success) {
        showSaveError(result.message);
        return false;
      }

      await mutate(
        (existing = []) =>
          existing.map((encounter) => {
            if (encounter.uuid !== encounterUuid) {
              return encounter;
            }
            return mergeObsIntoEncounterCache(encounter, obs);
          }),
        { revalidate: true },
      );
      showSaveSuccess(result.message.includes('warnings') ? result.message : `Monitoring saved for ${row.time}`);
      return true;
    },
    [
      patientUuid,
      encounterUuid,
      current.monitoring,
      current.monitoringSlotMinutes,
      current.monitoringAction,
      persistedSession?.machineCheck,
      mutate,
      concepts,
    ],
  );

  const persistMonitoringPayload = useCallback(
    async (
      rows: MonitoringRow[],
      sessionStartIso: string,
      slotMinutes: number[],
      action?: MonitoringSessionAction,
    ): Promise<boolean> => {
      if (!encounterUuid || !patientUuid) {
        showSaveError('Patient and encounter are required');
        return false;
      }

      const obs = buildMonitoringObs({ rows, sessionStartIso, slotMinutes, action }, concepts);
      if (obs.length === 0) {
        showSaveError('No monitoring observations to save.');
        return false;
      }

      const result = await appendHaemodialysisObservations(encounterUuid, obs, patientUuid, {
        strategy: obs.some((item) => item.groupMembers?.length) ? 'encounter' : 'obs',
        failOnPartial: true,
      });

      if (!result.success) {
        showSaveError(result.message);
        return false;
      }

      await mutate(
        (existing = []) =>
          existing.map((encounter) => {
            if (encounter.uuid !== encounterUuid) {
              return encounter;
            }
            return mergeObsIntoEncounterCache(encounter, obs);
          }),
        { revalidate: true },
      );
      return true;
    },
    [encounterUuid, patientUuid, mutate, concepts],
  );

  const saveMonitoringTerminate = useCallback(
    async (reason: string): Promise<boolean> => {
      if (!current.monitoringStartedAt) {
        showSaveError('Start monitoring before terminating');
        return false;
      }

      const trimmedReason = reason.trim();
      if (!trimmedReason) {
        showSaveError('A reason is required to terminate monitoring');
        return false;
      }

      const slotMinutes = current.monitoringSlotMinutes ?? buildDefaultSlotMinutes();
      const startedAt = parseMonitoringDatetime(current.monitoringStartedAt);
      const runtime = { slotLabelsMinutes: slotMinutes };
      const timeIndex = startedAt ? getTimeActiveSlotIndex(startedAt, new Date(), runtime) : 0;
      const timeSlotMinute = slotMinutes[timeIndex] ?? slotMinutes[slotMinutes.length - 1];
      const atSlotMinute = Math.max(getHighestFilledSlotMinute(current.monitoring) ?? 0, timeSlotMinute ?? 0);

      const action: MonitoringSessionAction = {
        type: 'terminated',
        atSlotMinute,
        reason: trimmedReason,
        recordedAt: toOmrsIsoString(new Date()),
      };

      const saved = await persistMonitoringPayload(
        current.monitoring,
        current.monitoringStartedAt,
        slotMinutes,
        action,
      );

      if (saved) {
        setSessionPatch({ monitoringAction: action });
        showSaveSuccess(`Monitoring terminated at ${atSlotMinute} min`);
      }
      return saved;
    },
    [current.monitoring, current.monitoringSlotMinutes, current.monitoringStartedAt, persistMonitoringPayload],
  );

  const saveMonitoringExtension = useCallback(
    async (hoursToAdd: number): Promise<boolean> => {
      if (!current.monitoringStartedAt) {
        showSaveError('Start monitoring before extending');
        return false;
      }

      const hours = Number.parseInt(String(hoursToAdd), 10);
      if (!Number.isFinite(hours) || hours <= 0) {
        showSaveError('Enter a valid number of hours to add');
        return false;
      }

      const currentSlots = current.monitoringSlotMinutes ?? buildDefaultSlotMinutes();
      const nextSlots = appendExtensionHours(currentSlots, hours);
      if (nextSlots.length === currentSlots.length) {
        showSaveError('Cannot extend monitoring further (maximum 12 hours total, up to 8 hours extension).');
        return false;
      }

      const action: MonitoringSessionAction = {
        type: 'extended',
        additionalHours: hours,
        recordedAt: toOmrsIsoString(new Date()),
      };

      setSessionPatch((previous) => ({
        ...previous,
        monitoringSlotMinutes: nextSlots,
        monitoringAction: action,
      }));

      const saved = await persistMonitoringPayload(current.monitoring, current.monitoringStartedAt, nextSlots, action);

      if (saved) {
        showSaveSuccess(
          `Monitoring extended by ${hours} hour(s) — ${nextSlots.length - currentSlots.length} row(s) added`,
        );
      } else {
        setSessionPatch((previous) => {
          const reverted = { ...previous };
          delete reverted.monitoringSlotMinutes;
          delete reverted.monitoringAction;
          return reverted;
        });
      }
      return saved;
    },
    [current.monitoring, current.monitoringSlotMinutes, current.monitoringStartedAt, persistMonitoringPayload],
  );

  const savePostDialysisAndSummary = useCallback(
    async (postDialysis: PostDialysisAssessment, summary: DialysisSummary): Promise<boolean> => {
      if (!encounterUuid) {
        showSaveError('Save the initial assessment before completing post-dialysis');
        return false;
      }

      const encounterDatetime = toOmrsIsoString(new Date());
      const obs = buildPostDialysisObs(
        postDialysis,
        summary,
        encounterDatetime,
        persistedSession?.postHdNurseNotes,
        concepts,
      );
      const hasObsGroups = obs.some((item) => item.groupMembers?.length);
      const result = await appendHaemodialysisObservations(encounterUuid, obs, patientUuid, {
        strategy: hasObsGroups ? 'encounter' : 'obs',
        failOnPartial: true,
      });

      if (!result.success) {
        showSaveError(result.message);
        return false;
      }

      await mutate(
        (existing = []) =>
          existing.map((encounter) => {
            if (encounter.uuid !== encounterUuid) {
              return encounter;
            }
            return mergeObsIntoEncounterCache(encounter, obs);
          }),
        { revalidate: true },
      );
      showSaveSuccess(
        result.message.includes('warnings') ? result.message : 'Post-dialysis assessment and summary saved',
      );
      return true;
    },
    [encounterUuid, patientUuid, persistedSession?.postHdNurseNotes, mutate, concepts],
  );

  const startNewDialysis = useCallback(() => {
    setIsNewDialysisDraft(true);
    setSessionPatch({});
  }, []);

  const isCurrentSessionComplete = isDialysisSessionComplete(persistedSession);
  const canStartNewDialysis = Boolean(persistedSession && isCurrentSessionComplete && !isNewDialysisDraft);

  return {
    session: current,
    isLoading: Boolean(patientUuid) && isLoading && !data,
    error,
    hasInitial: !isNewDialysisDraft && hasInitialAssessment(persistedSession),
    hasMachineCheck: !isNewDialysisDraft && Boolean(persistedSession?.machineCheck),
    hasMonitoring: Boolean(persistedSession?.monitoring?.length),
    isNewDialysisDraft,
    isCurrentSessionComplete,
    canStartNewDialysis,
    tableSessions,
    startNewDialysis,
    saveInitialAssessment,
    saveMachineCheck,
    saveMonitoringSlot,
    saveMonitoringTerminate,
    saveMonitoringExtension,
    savePostDialysisAndSummary,
    refresh: mutate,
  };
}
