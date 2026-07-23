import { useCallback, useMemo } from 'react';
import { age, getPatientName, showSnackbar, toOmrsIsoString, useSession, useVisit } from '@openmrs/esm-framework';
import useSWR from 'swr';
import {
  hasInitialAssessment,
  type DialysisSummary,
  type FacilityHeader,
  type HaemodialysisSession,
  type MonitoringRow,
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

const toEncounterDatetime = (sessionDate: string): string => {
  const date = sessionDate?.trim() ? new Date(sessionDate) : new Date();
  if (Number.isNaN(date.getTime())) {
    return toOmrsIsoString(new Date());
  }
  const now = new Date();
  date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
  return toOmrsIsoString(date);
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

  const persistedSession = useMemo((): HaemodialysisSession | null => {
    const encounters = data ?? [];
    const latestEncounter = encounters.find((encounter) =>
      hasEncounterInitialAssessment(encounter, concepts, visitDiagnosis),
    );
    if (!latestEncounter) {
      return null;
    }
    return parseEncounterToSession(latestEncounter, patientUuid ?? '', biodataBase, facility, concepts, visitDiagnosis);
  }, [data, patientUuid, biodataBase, facility, concepts, visitDiagnosis]);

  const current: HaemodialysisSession = useMemo(
    () =>
      persistedSession ?? {
        patientUuid: patientUuid ?? '',
        biodata: biodataBase,
        facility,
        monitoring: [],
      },
    [persistedSession, patientUuid, biodataBase, facility],
  );

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
      const obs = buildMonitoringObs(monitoring, sessionStartIso, concepts);

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
    [patientUuid, encounterUuid, current.monitoring, persistedSession?.machineCheck, mutate, concepts],
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

  return {
    session: current,
    isLoading: Boolean(patientUuid) && isLoading && !data,
    error,
    hasInitial: hasInitialAssessment(persistedSession),
    hasMachineCheck: Boolean(persistedSession?.machineCheck),
    hasMonitoring: Boolean(persistedSession?.monitoring?.length),
    saveInitialAssessment,
    saveMachineCheck,
    saveMonitoringSlot,
    savePostDialysisAndSummary,
    refresh: mutate,
  };
}
