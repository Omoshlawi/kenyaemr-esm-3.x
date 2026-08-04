import type {
  AdditionalMedicationRow,
  DialysisMachineCheck,
  DialysisSummary,
  FacilityHeader,
  HaemodialysisSession,
  MonitoringRow,
  MonitoringSessionAction,
  PatientBiodata,
  PhysicianPrescription,
  PostDialysisAssessment,
  PreDialysisAssessment,
  ScreeningStatus,
  SignatureBlock,
} from '../types';
import {
  HAEMODIALYSIS_ANSWERS,
  HAEMODIALYSIS_CONCEPTS,
  VISIT_DIAGNOSIS_CONCEPTS,
  type HaemodialysisConceptMap,
  type VisitDiagnosisConceptMap,
} from '../concepts/haemodialysis-concepts';
import {
  ACCESS_TYPE_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  DIALYSATE_COMPOSITION_OPTIONS,
  DIALYZER_TYPE_OPTIONS,
  DIALYSATE_ACID_CONCENTRATE_ANSWER,
  DIALYSATE_POTASSIUM_BATH_ANSWER,
  DIALYSATE_SODIUM_BICARBONATE_ANSWER,
  FLUX_TYPE_OPTIONS,
  getCodedAnswerLabel,
  HEPATITIS_B_STATUS_OPTIONS,
  HEPATITIS_C_STATUS_OPTIONS,
  HIV_STATUS_OPTIONS,
  MEMBRANE_TYPE_OPTIONS,
  OTHERS_CONCEPT_ANSWER,
  SYPHILIS_STATUS_OPTIONS,
  YES_NO_OPTIONS,
} from '../constants/coded-answers';
import { formatSlotClockTime, formatSlotLabel } from './monitoring-slots';
import {
  buildDefaultSlotMinutes,
  appendExtensionHours,
  getExtensionHoursFromSchedule,
  BASE_MONITORING_MAX_MINUTES,
} from './monitoring-schedule';
import { parseMonitoringDatetime, parseToOpenMrsObsDatetimeValue, toMonitoringIsoString } from './monitoring-datetime';
import { toOmrsIsoString } from '@openmrs/esm-framework';
import { isValidOpenmrsUuid } from './openmrs-uuid';
import { INCLUDE_ICD11_DIAGNOSIS_OBS, TOP_LEVEL_CODED_OBS_AS_OBJECT } from '../constants/encounter-post-flags';
import { isInitialObsFieldEnabled } from '../constants/initial-obs-flags';
import { isMachineCheckObsFieldEnabled } from '../constants/machine-check-obs-flags';
import { AIR_DETECTOR_OPTIONS, BLOOD_LEAK_OPTIONS } from '../constants/machine-check-answers';
import { isScreeningObsFieldEnabled } from '../constants/screening-obs-flags';
import { isPostDialysisObsFieldEnabled } from '../constants/post-dialysis-obs-flags';
import {
  INCLUDE_CONNECTION_TIME_ON_FIRST_SLOT,
  INCLUDE_DEDICATED_MONITORING_CONCEPTS,
  INCLUDE_STRUCTURED_MONITORING_NOTES,
} from '../constants/monitoring-obs-flags';

export type CodedObsValue = { uuid: string };

export type HaemodialysisObsGroupMember = {
  concept: string;
  value: string | number | CodedObsValue;
};

export type HaemodialysisObsInput = {
  concept: string;
  value?: string | number | CodedObsValue;
  obsDatetime?: string;
  groupMembers?: HaemodialysisObsGroupMember[];
};

export type HaemodialysisEncounterResource = {
  uuid: string;
  encounterDatetime: string;
  obs?: Array<HaemodialysisEncounterObs>;
  diagnoses?: Array<{
    diagnosis?: {
      coded?: { uuid?: string; display?: string };
      nonCoded?: string;
    };
  }>;
  encounterProviders?: Array<{
    provider?: { person?: { display?: string }; name?: string };
  }>;
};

export type HaemodialysisEncounterObs = {
  uuid?: string;
  concept?: { uuid?: string; display?: string };
  value?: unknown;
  obsDatetime?: string;
  groupMembers?: HaemodialysisEncounterObs[];
};

const MONITORING_NOTES_PREFIX = '__HD_MONITORING__';
const MONITORING_NOTES_SUFFIX = '__END_HD_MONITORING__';

export const extractMonitoringBlock = (notes?: string): string => {
  if (!notes?.includes(MONITORING_NOTES_PREFIX)) {
    return '';
  }
  const suffixIndex = notes.indexOf(MONITORING_NOTES_SUFFIX);
  if (suffixIndex === -1) {
    return '';
  }
  return notes.slice(0, suffixIndex + MONITORING_NOTES_SUFFIX.length);
};

export const extractUserNurseNotes = (notes?: string): string => {
  if (!notes?.trim()) {
    return '';
  }
  if (!notes.includes(MONITORING_NOTES_PREFIX)) {
    return notes.trim();
  }
  return (notes.split(MONITORING_NOTES_SUFFIX)[1] ?? '').trim();
};

export const combinePostHdNurseNotes = (existingNotes?: string, userNotes?: string): string => {
  const monitoringBlock = extractMonitoringBlock(existingNotes);
  const trimmedUser = userNotes?.trim() ?? '';
  if (monitoringBlock && trimmedUser) {
    return `${monitoringBlock}\n${trimmedUser}`;
  }
  if (monitoringBlock) {
    return monitoringBlock;
  }
  return trimmedUser;
};

const C = HAEMODIALYSIS_CONCEPTS;

const isConcept = (obs: HaemodialysisEncounterObs, conceptUuid: string) => obs.concept?.uuid === conceptUuid;

const getObsByConcept = (observations: HaemodialysisEncounterObs[], conceptUuid: string) =>
  observations.filter((obs) => isConcept(obs, conceptUuid));

const normalizeValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }
  if (typeof value === 'object' && value !== null && 'uuid' in value) {
    const uuid = String((value as { uuid: string }).uuid);
    const display =
      'display' in value && (value as { display?: string }).display
        ? String((value as { display?: string }).display)
        : '';
    return getCodedAnswerLabel(uuid) || display || uuid;
  }
  return String(value);
};

const getAllCodedObsValues = (observations: HaemodialysisEncounterObs[], conceptUuid: string): string[] =>
  getObsByConcept(observations, conceptUuid)
    .map((obs) => {
      const raw = obs.value;
      if (raw && typeof raw === 'object' && 'uuid' in raw) {
        return String((raw as { uuid: string }).uuid);
      }
      if (typeof raw === 'string' && isValidOpenmrsUuid(raw)) {
        return raw;
      }
      return normalizeValue(raw);
    })
    .filter(Boolean);

const getCodedObsValue = (observations: HaemodialysisEncounterObs[], conceptUuid: string): string => {
  const values = getAllCodedObsValues(observations, conceptUuid);
  return values[0] ?? '';
};

const parseNumeric = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export { isValidOpenmrsUuid } from './openmrs-uuid';

export const buildTextObs = (concept: string, value?: string, obsDatetime?: string): HaemodialysisObsInput | null => {
  if (!concept || !value?.trim()) {
    return null;
  }
  return { concept, value: value.trim(), obsDatetime };
};

export const buildCodedObs = (
  concept: string,
  value?: string,
  obsDatetime?: string,
  allowedAnswers?: readonly string[],
): HaemodialysisObsInput | null => {
  if (!concept || !value?.trim()) {
    return null;
  }
  const trimmed = value.trim();
  if (!isValidOpenmrsUuid(trimmed)) {
    return null;
  }
  if (allowedAnswers && !allowedAnswers.includes(trimmed)) {
    return null;
  }
  const codedValue = TOP_LEVEL_CODED_OBS_AS_OBJECT ? { uuid: trimmed } : trimmed;
  return { concept, value: codedValue, obsDatetime };
};

/** Checkbox / multi-select coded fields: one obs per selected answer (O3 form behaviour). */
export const buildCheckboxCodedObs = (
  concept: string,
  values?: string | string[],
  obsDatetime?: string,
  allowedAnswers?: readonly string[],
): HaemodialysisObsInput[] => {
  if (!concept) {
    return [];
  }
  const selections = (Array.isArray(values) ? values : values ? [values] : [])
    .map((value) => value.trim())
    .filter(Boolean);
  return selections
    .map((value) => buildCodedObs(concept, value, obsDatetime, allowedAnswers))
    .filter((item): item is HaemodialysisObsInput => item != null);
};

const resolveYesNoAnswer = (value?: string): string | null => {
  if (!value?.trim()) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'yes' || normalized === HAEMODIALYSIS_ANSWERS.yes.toLowerCase()) {
    return HAEMODIALYSIS_ANSWERS.yes;
  }
  if (normalized === 'no' || normalized === HAEMODIALYSIS_ANSWERS.no.toLowerCase()) {
    return HAEMODIALYSIS_ANSWERS.no;
  }
  if (isValidOpenmrsUuid(value.trim())) {
    return value.trim();
  }
  return null;
};

export const buildYesNoCodedObs = (
  concept: string,
  value?: string,
  obsDatetime?: string,
): HaemodialysisObsInput | null => {
  const coded = resolveYesNoAnswer(value);
  if (!coded) {
    return null;
  }
  const codedValue = TOP_LEVEL_CODED_OBS_AS_OBJECT ? { uuid: coded } : coded;
  return { concept, value: codedValue, obsDatetime };
};

const splitBloodPressure = (value?: string): { systolic?: string; diastolic?: string } => {
  if (!value?.trim()) {
    return {};
  }
  const parts = value.split('/').map((part) => part.trim());
  if (parts.length === 2) {
    return { systolic: parts[0], diastolic: parts[1] };
  }
  return { systolic: value.trim() };
};

const collectObs = (items: Array<HaemodialysisObsInput | null>): HaemodialysisObsInput[] =>
  items.filter((item): item is HaemodialysisObsInput => item != null);

/** Visit Diagnoses obs group for Core REST (replaces nested `diagnoses` on encounter POST). */
export const buildVisitDiagnosisObsGroup = (
  diagnosisUuid?: string,
  encounterDatetime?: string,
  visitDiagnosis: VisitDiagnosisConceptMap = VISIT_DIAGNOSIS_CONCEPTS,
): HaemodialysisObsInput | null => {
  if (!diagnosisUuid?.trim() || !isValidOpenmrsUuid(diagnosisUuid.trim())) {
    return null;
  }

  const D = visitDiagnosis;
  return {
    concept: D.construct,
    obsDatetime: encounterDatetime,
    groupMembers: [
      { concept: D.problem, value: diagnosisUuid.trim() },
      { concept: D.certainty, value: D.certaintyProvisional },
      { concept: D.rank, value: D.rankPrimary },
    ],
  };
};

/** Pre-dialysis BP on Ampath concept 008bf719 (distinct from post CIEL 5085/5086). */
export const buildPreDialysisBloodPressureObs = (value?: string, obsDatetime?: string): HaemodialysisObsInput[] => {
  return collectObs([buildTextObs(C.preDialysis.bloodPressure, value, obsDatetime)]);
};

export const buildNumericObs = (
  concept: string,
  value?: string,
  obsDatetime?: string,
): HaemodialysisObsInput | null => {
  if (!concept || !value?.trim()) {
    return null;
  }
  const numeric = parseNumeric(value.trim());
  if (numeric == null) {
    return null;
  }
  return { concept, value: numeric, obsDatetime };
};

export const buildInitialAssessmentObs = (
  screening: ScreeningStatus,
  preDialysis: PreDialysisAssessment,
  prescription: PhysicianPrescription,
  encounterDatetime: string,
  diagnosis?: { uuid: string } | null,
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
  visitDiagnosis: VisitDiagnosisConceptMap = VISIT_DIAGNOSIS_CONCEPTS,
): HaemodialysisObsInput[] => {
  const C = concepts;
  const accessTypeAnswers = ACCESS_TYPE_OPTIONS.map((option) => option.value);
  const dialyzerTypeAnswers = DIALYZER_TYPE_OPTIONS.map((option) => option.value);
  const dialysateAnswers = DIALYSATE_COMPOSITION_OPTIONS.map((option) => option.value);
  const bloodGroupAnswers = BLOOD_GROUP_OPTIONS.map((option) => option.value);
  const hivAnswers = HIV_STATUS_OPTIONS.map((option) => option.value);
  const hepCAnswers = HEPATITIS_C_STATUS_OPTIONS.map((option) => option.value);
  const hepBAnswers = HEPATITIS_B_STATUS_OPTIONS.map((option) => option.value);
  const syphilisAnswers = SYPHILIS_STATUS_OPTIONS.map((option) => option.value);

  const candidates: Array<HaemodialysisObsInput | null> = [];

  if (isScreeningObsFieldEnabled('bloodGroup')) {
    candidates.push(buildCodedObs(C.screening.bloodGroup, screening.bloodGroup, encounterDatetime, bloodGroupAnswers));
  }
  if (isScreeningObsFieldEnabled('hivStatus')) {
    candidates.push(buildCodedObs(C.screening.hivStatus, screening.hivStatus, encounterDatetime, hivAnswers));
  }
  if (isScreeningObsFieldEnabled('hepatitisCStatus')) {
    candidates.push(
      buildCodedObs(C.screening.hepatitisCStatus, screening.hepatitisCStatus, encounterDatetime, hepCAnswers),
    );
  }
  if (isScreeningObsFieldEnabled('hepatitisBStatus')) {
    candidates.push(
      buildCodedObs(C.screening.hepatitisBStatus, screening.hepatitisBStatus, encounterDatetime, hepBAnswers),
    );
  }
  if (isScreeningObsFieldEnabled('syphilisStatus')) {
    candidates.push(
      buildCodedObs(C.screening.syphilisStatus, screening.syphilisStatus, encounterDatetime, syphilisAnswers),
    );
  }
  if (isScreeningObsFieldEnabled('drugAllergy')) {
    candidates.push(buildTextObs(C.screening.drugAllergy, screening.drugAllergy, encounterDatetime));
  }

  if (isInitialObsFieldEnabled('weightBefore')) {
    candidates.push(buildNumericObs(C.preDialysis.weightBefore, preDialysis.weightBefore, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('targetDryWeight')) {
    candidates.push(buildNumericObs(C.preDialysis.targetDryWeight, preDialysis.targetDryWeight, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('interdialyticWeightGain')) {
    candidates.push(
      buildNumericObs(C.preDialysis.interdialyticWeightGain, preDialysis.interdialyticWeightGain, encounterDatetime),
    );
  }
  if (isInitialObsFieldEnabled('height')) {
    candidates.push(buildNumericObs(C.preDialysis.height, preDialysis.height, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('bodyMassIndex')) {
    candidates.push(buildNumericObs(C.preDialysis.bodyMassIndex, preDialysis.bodyMassIndex, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('bloodPressure')) {
    candidates.push(...buildPreDialysisBloodPressureObs(preDialysis.bloodPressure, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('pulse')) {
    candidates.push(buildNumericObs(C.preDialysis.pulse, preDialysis.pulse, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('temperature')) {
    candidates.push(buildNumericObs(C.preDialysis.temperature, preDialysis.temperature, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('respiratoryRate')) {
    candidates.push(buildNumericObs(C.preDialysis.respiratoryRate, preDialysis.respiratoryRate, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('oxygenSaturation')) {
    candidates.push(buildNumericObs(C.preDialysis.oxygenSaturation, preDialysis.oxygenSaturation, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('bloodSugar')) {
    candidates.push(buildNumericObs(C.preDialysis.bloodSugar, preDialysis.bloodSugar, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('accessType')) {
    candidates.push(
      buildCodedObs(C.preDialysis.accessType, preDialysis.accessType, encounterDatetime, accessTypeAnswers),
    );
  }
  if (isInitialObsFieldEnabled('additionalAssessment')) {
    candidates.push(
      buildTextObs(C.preDialysis.additionalAssessment, preDialysis.additionalAssessment, encounterDatetime),
    );
  }
  if (isInitialObsFieldEnabled('accessSite')) {
    candidates.push(buildNumericObs(C.postDialysis.accessSite, preDialysis.accessSite, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('doctorNephrologist')) {
    candidates.push(buildTextObs(C.summary.doctorName, preDialysis.doctorNephrologist, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('dialyzerType')) {
    candidates.push(
      buildCodedObs(C.prescription.dialyzerType, prescription.dialyzerType, encounterDatetime, dialyzerTypeAnswers),
    );
  }
  if (isInitialObsFieldEnabled('membraneType')) {
    candidates.push(
      buildCodedObs(
        C.prescription.membraneType,
        prescription.membraneType,
        encounterDatetime,
        MEMBRANE_TYPE_OPTIONS.map((option) => option.value),
      ),
    );
  }
  if (isInitialObsFieldEnabled('specifyOtherMembraneType') && prescription.membraneType === OTHERS_CONCEPT_ANSWER) {
    candidates.push(
      buildTextObs(C.prescription.specifyOtherMembraneType, prescription.specifyOtherMembraneType, encounterDatetime),
    );
  }
  if (isInitialObsFieldEnabled('fluxType')) {
    candidates.push(
      buildCodedObs(
        C.prescription.fluxType,
        prescription.fluxType,
        encounterDatetime,
        FLUX_TYPE_OPTIONS.map((option) => option.value),
      ),
    );
  }
  if (isInitialObsFieldEnabled('dialyzerSize')) {
    candidates.push(buildNumericObs(C.prescription.dialyzerSize, prescription.dialyzerSize, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('prescribedFrequencyPerWeek')) {
    candidates.push(
      buildNumericObs(
        C.prescription.prescribedFrequencyPerWeek,
        prescription.prescribedFrequencyPerWeek,
        encounterDatetime,
      ),
    );
  }
  if (isInitialObsFieldEnabled('bfr')) {
    candidates.push(buildNumericObs(C.prescription.bfr, prescription.bfr, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('dialysateComposition')) {
    candidates.push(
      ...buildCheckboxCodedObs(
        C.prescription.dialysateComposition,
        prescription.dialysateComposition,
        encounterDatetime,
        dialysateAnswers,
      ),
    );
  }
  const dialysateSelected = Array.isArray(prescription.dialysateComposition)
    ? prescription.dialysateComposition
    : prescription.dialysateComposition
    ? [prescription.dialysateComposition]
    : [];
  if (
    isInitialObsFieldEnabled('acidConcentrateAmount') &&
    dialysateSelected.includes(DIALYSATE_ACID_CONCENTRATE_ANSWER)
  ) {
    candidates.push(
      buildNumericObs(C.prescription.acidConcentrateAmount, prescription.acidConcentrateAmount, encounterDatetime),
    );
  }
  if (
    isInitialObsFieldEnabled('sodiumBicarbonateConcentration') &&
    dialysateSelected.includes(DIALYSATE_SODIUM_BICARBONATE_ANSWER)
  ) {
    candidates.push(
      buildNumericObs(
        C.prescription.sodiumBicarbonateConcentration,
        prescription.sodiumBicarbonateConcentration,
        encounterDatetime,
      ),
    );
  }
  if (
    isInitialObsFieldEnabled('potassiumBathConcentration') &&
    dialysateSelected.includes(DIALYSATE_POTASSIUM_BATH_ANSWER)
  ) {
    candidates.push(
      buildNumericObs(
        C.prescription.potassiumBathConcentration,
        prescription.potassiumBathConcentration,
        encounterDatetime,
      ),
    );
  }
  if (isInitialObsFieldEnabled('dialysateCompositionOther') && dialysateSelected.includes(OTHERS_CONCEPT_ANSWER)) {
    candidates.push(
      buildTextObs(C.prescription.dialysateCompositionOther, prescription.dialysateCompositionOther, encounterDatetime),
    );
  }
  if (isInitialObsFieldEnabled('otherDialysateAmount') && dialysateSelected.includes(OTHERS_CONCEPT_ANSWER)) {
    candidates.push(
      buildTextObs(C.prescription.otherDialysateAmount, prescription.otherDialysateAmount, encounterDatetime),
    );
  }
  if (isInitialObsFieldEnabled('dfr')) {
    candidates.push(buildNumericObs(C.prescription.dfr, prescription.dfr, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('ufGoal')) {
    candidates.push(buildNumericObs(C.prescription.ufGoal, prescription.ufGoal, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('heparinDose')) {
    candidates.push(buildNumericObs(C.prescription.heparinDose, prescription.heparinDose, encounterDatetime));
  }
  if (isInitialObsFieldEnabled('duration')) {
    candidates.push(buildNumericObs(C.summary.prescribedDuration, prescription.duration, encounterDatetime));
  }

  if (INCLUDE_ICD11_DIAGNOSIS_OBS) {
    const diagnosisObs = buildVisitDiagnosisObsGroup(diagnosis?.uuid, encounterDatetime, visitDiagnosis);
    if (diagnosisObs) {
      candidates.push(diagnosisObs);
    }
  }

  return collectObs(candidates);
};

export const buildMachineCheckObs = (
  machineCheck: DialysisMachineCheck,
  encounterDatetime?: string,
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
): HaemodialysisObsInput[] => {
  const C = concepts;
  const defaultDatetime = encounterDatetime ?? toOmrsIsoString(new Date());
  const bloodLeakAnswers = BLOOD_LEAK_OPTIONS.map((option) => option.value);
  const airDetectorAnswers = AIR_DETECTOR_OPTIONS.map((option) => option.value);
  const candidates: Array<HaemodialysisObsInput | null> = [];

  if (isMachineCheckObsFieldEnabled('machineCheckDate')) {
    candidates.push(
      buildTextObs(
        C.machineChecks.machineCheckDate,
        parseToOpenMrsObsDatetimeValue(machineCheck.machineCheckDate),
        defaultDatetime,
      ),
    );
  }
  if (isMachineCheckObsFieldEnabled('bloodLeaks')) {
    candidates.push(
      buildCodedObs(C.machineChecks.bloodLeaks, machineCheck.bloodLeaks, defaultDatetime, bloodLeakAnswers),
    );
  }
  if (isMachineCheckObsFieldEnabled('bloodLeakDateTime')) {
    candidates.push(
      buildTextObs(
        C.machineChecks.bloodLeakDateTime,
        parseToOpenMrsObsDatetimeValue(machineCheck.bloodLeakDateTime),
        defaultDatetime,
      ),
    );
  }
  if (isMachineCheckObsFieldEnabled('airDetector')) {
    candidates.push(
      buildCodedObs(C.machineChecks.airDetector, machineCheck.airDetector, defaultDatetime, airDetectorAnswers),
    );
  }
  if (isMachineCheckObsFieldEnabled('airDetectorDateTime')) {
    candidates.push(
      buildTextObs(
        C.machineChecks.airDetectorDateTime,
        parseToOpenMrsObsDatetimeValue(machineCheck.airDetectorDateTime),
        defaultDatetime,
      ),
    );
  }
  if (isMachineCheckObsFieldEnabled('dialysisFluidTemperature')) {
    candidates.push(
      buildNumericObs(C.machineChecks.dialysisFluidTemperature, machineCheck.dialysisFluidTemperature, defaultDatetime),
    );
  }
  if (isMachineCheckObsFieldEnabled('conductivity')) {
    candidates.push(buildNumericObs(C.machineChecks.conductivity, machineCheck.conductivity, defaultDatetime));
  }
  if (isMachineCheckObsFieldEnabled('transmembranePressure')) {
    candidates.push(
      buildNumericObs(C.machineChecks.transmembranePressure, machineCheck.transmembranePressure, defaultDatetime),
    );
  }

  return collectObs(candidates);
};

const encodeMonitoringField = (value?: string): string => (value ?? '').replace(/\|/g, '\\|');

const decodeMonitoringField = (value?: string): string => (value ?? '').replace(/\\\|/g, '|');

export type ParsedMonitoringNotes = {
  startedAt?: string;
  rows: MonitoringRow[];
  slotMinutes?: number[];
  action?: MonitoringSessionAction;
};

export type MonitoringPersistInput = {
  rows: MonitoringRow[];
  sessionStartIso: string;
  slotMinutes?: number[];
  action?: MonitoringSessionAction;
};

const encodeMonitoringNotes = ({
  startedAt,
  rows,
  slotMinutes,
  action,
}: {
  startedAt: string;
  rows: MonitoringRow[];
  slotMinutes?: number[];
  action?: MonitoringSessionAction;
}): string => {
  const metaLines: string[] = [`startedAt:${startedAt}`];
  if (slotMinutes?.length) {
    metaLines.push(`slotSchedule:${slotMinutes.join(',')}`);
  }
  if (action?.type === 'terminated') {
    metaLines.push('action:terminated');
    metaLines.push(`terminatedAt:${action.atSlotMinute}`);
    metaLines.push(`terminateReason:${encodeMonitoringField(action.reason)}`);
  } else if (action?.type === 'extended') {
    metaLines.push('action:extended');
    metaLines.push(`extensionHours:${action.additionalHours}`);
  }

  const lines = rows
    .slice()
    .sort((a, b) => a.slotMinute - b.slotMinute)
    .map((row) =>
      [
        row.slotMinute,
        encodeMonitoringField(row.bp),
        encodeMonitoringField(row.pulse),
        encodeMonitoringField(row.temp),
        encodeMonitoringField(row.ufRemoved),
        encodeMonitoringField(row.heparin),
        encodeMonitoringField(row.remarks),
      ].join('|'),
    );
  return [MONITORING_NOTES_PREFIX, ...metaLines, ...lines, MONITORING_NOTES_SUFFIX].join('\n');
};

export const parseMonitoringNotes = (notes?: string): ParsedMonitoringNotes => {
  if (!notes?.includes(MONITORING_NOTES_PREFIX)) {
    return { rows: [] };
  }

  const block = notes.split(MONITORING_NOTES_PREFIX)[1]?.split(MONITORING_NOTES_SUFFIX)[0] ?? '';
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let startedAt: string | undefined;
  let slotMinutes: number[] | undefined;
  let action: MonitoringSessionAction | undefined;
  const rows: MonitoringRow[] = [];

  lines.forEach((line) => {
    if (line.startsWith('startedAt:')) {
      startedAt = line.replace('startedAt:', '').trim();
      return;
    }
    if (line.startsWith('slotSchedule:')) {
      slotMinutes = line
        .replace('slotSchedule:', '')
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((minute) => Number.isFinite(minute));
      return;
    }
    if (line === 'action:terminated') {
      action = { type: 'terminated', atSlotMinute: 0, reason: '' };
      return;
    }
    if (line.startsWith('terminatedAt:') && action?.type === 'terminated') {
      action = { ...action, atSlotMinute: Number(line.replace('terminatedAt:', '').trim()) || 0 };
      return;
    }
    if (line.startsWith('terminateReason:') && action?.type === 'terminated') {
      action = { ...action, reason: decodeMonitoringField(line.replace('terminateReason:', '').trim()) };
      return;
    }
    if (line === 'action:extended') {
      action = { type: 'extended', additionalHours: action?.type === 'extended' ? action.additionalHours : 0 };
      return;
    }
    if (line.startsWith('extensionHours:')) {
      const hours = Number(line.replace('extensionHours:', '').trim());
      if (Number.isFinite(hours) && hours > 0) {
        action = { type: 'extended', additionalHours: hours };
      }
      return;
    }
    if (line.startsWith('action:')) {
      return;
    }

    const [slotMinute, bp, pulse, temp, ufRemoved, heparin, ...remarksParts] = line.split('|');
    const minute = Number(slotMinute);
    if (!Number.isFinite(minute)) {
      return;
    }
    const startDate = startedAt ? parseMonitoringDatetime(startedAt) ?? new Date() : new Date();
    const label = `${formatSlotLabel(minute)} (${formatSlotClockTime(startDate, minute)})`;
    rows.push({
      slotMinute: minute,
      time: label,
      bp: decodeMonitoringField(bp),
      pulse: decodeMonitoringField(pulse),
      temp: decodeMonitoringField(temp),
      ufRemoved: decodeMonitoringField(ufRemoved),
      heparin: decodeMonitoringField(heparin),
      remarks: decodeMonitoringField(remarksParts.join('|')),
    });
  });

  let resolvedSlots = slotMinutes?.length ? [...slotMinutes].sort((a, b) => a - b) : buildDefaultSlotMinutes();

  if (action?.type === 'extended' && action.additionalHours > 0) {
    const extensionOnSchedule = resolvedSlots.filter((minute) => minute > BASE_MONITORING_MAX_MINUTES).length;
    if (extensionOnSchedule < action.additionalHours) {
      const baseSlots = resolvedSlots.filter((minute) => minute <= BASE_MONITORING_MAX_MINUTES);
      const base = baseSlots.length ? baseSlots : buildDefaultSlotMinutes();
      resolvedSlots = appendExtensionHours(base, action.additionalHours - extensionOnSchedule);
    }
  }

  return { startedAt, rows, slotMinutes: resolvedSlots, action };
};

const parseMonitoringSessionActionFromObs = (
  observations: HaemodialysisEncounterObs[],
  concepts: HaemodialysisConceptMap,
  sessionStartIso?: string,
): MonitoringSessionAction | undefined => {
  const A = concepts.monitoringAction;
  if (!A?.actionGroup?.trim()) {
    return undefined;
  }

  const groups = sortObsByDatetimeAsc(observations, A.actionGroup);
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    const terminateReason = A.terminateReason?.trim() ? getGroupMemberValue(group, A.terminateReason).trim() : '';
    const decision = A.decision?.trim() ? getGroupMemberValue(group, A.decision).trim() : '';

    const startedAt = sessionStartIso ? parseMonitoringDatetime(sessionStartIso) : null;
    const obsTime = group.obsDatetime ? new Date(group.obsDatetime) : null;
    const atSlotMinute =
      startedAt && obsTime && !Number.isNaN(obsTime.getTime())
        ? Math.max(0, Math.round((obsTime.getTime() - startedAt.getTime()) / 60_000))
        : 0;

    if (terminateReason) {
      return {
        type: 'terminated',
        atSlotMinute,
        reason: terminateReason,
        recordedAt: group.obsDatetime,
      };
    }

    if (decision === A.terminateProgressAnswer?.trim()) {
      return {
        type: 'terminated',
        atSlotMinute,
        reason: terminateReason,
        recordedAt: group.obsDatetime,
      };
    }

    if (decision === A.extendHourlyAnswer?.trim()) {
      return { type: 'extended', additionalHours: 0, recordedAt: group.obsDatetime };
    }
  }

  return undefined;
};

const resolveMonitoringSessionAction = (
  fromNotes?: MonitoringSessionAction,
  fromObs?: MonitoringSessionAction,
): MonitoringSessionAction | undefined => {
  if (fromNotes?.type === 'terminated') {
    return fromNotes;
  }
  if (fromObs?.type === 'terminated') {
    return fromObs;
  }
  if (fromNotes?.type === 'extended' && fromNotes.additionalHours > 0) {
    return fromNotes;
  }
  if (fromNotes?.type === 'extended' && fromObs?.type === 'extended') {
    return {
      type: 'extended',
      additionalHours: Math.max(fromNotes.additionalHours, fromObs.additionalHours ?? 0),
      recordedAt: fromObs.recordedAt ?? fromNotes.recordedAt,
    };
  }
  return fromNotes ?? fromObs;
};

/** Prefer the nurse-notes block with the richest extension schedule (fixes 1h extend when an older note is "latest" by datetime). */
const pickBestMonitoringNotesParse = (
  observations: HaemodialysisEncounterObs[],
  conceptUuid: string,
): ParsedMonitoringNotes => {
  const matches = sortObsByDatetimeAsc(observations, conceptUuid);
  let best: ParsedMonitoringNotes = { rows: [] };
  let bestScore = -1;

  for (const obs of matches) {
    const notes = normalizeValue(obs.value);
    if (!notes.includes(MONITORING_NOTES_PREFIX)) {
      continue;
    }
    const parsed = parseMonitoringNotes(notes);
    const slots = parsed.slotMinutes ?? buildDefaultSlotMinutes();
    const extensionSlots = getExtensionHoursFromSchedule(slots);
    const score = extensionSlots * 1000 + slots.length * 10 + parsed.rows.length;
    if (score > bestScore) {
      bestScore = score;
      best = parsed;
    }
  }

  if (bestScore < 0) {
    const fallback = getLatestObsValue(observations, conceptUuid);
    return parseMonitoringNotes(fallback);
  }

  return best;
};

export const buildMonitoringActionObs = (
  action: MonitoringSessionAction,
  encounterDatetime: string,
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
): HaemodialysisObsInput | null => {
  const A = concepts.monitoringAction;
  if (!A?.actionGroup?.trim()) {
    return null;
  }

  const groupMembers: HaemodialysisObsGroupMember[] = [];

  if (A.decision?.trim()) {
    if (action.type === 'terminated') {
      groupMembers.push({ concept: A.decision, value: A.terminateProgressAnswer });
    } else if (action.type === 'extended') {
      groupMembers.push({ concept: A.decision, value: A.extendHourlyAnswer });
    }
  }

  if (action.type === 'terminated' && A.terminateReason?.trim() && action.reason?.trim()) {
    groupMembers.push({ concept: A.terminateReason, value: action.reason.trim() });
  }

  if (groupMembers.length === 0) {
    return null;
  }

  return {
    concept: A.actionGroup,
    obsDatetime: encounterDatetime,
    groupMembers,
  };
};

export const buildMonitoringObs = (
  input: MonitoringPersistInput,
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
): HaemodialysisObsInput[] => {
  const { rows, sessionStartIso, slotMinutes, action } = input;
  const C = concepts;
  if (rows.length === 0 && action?.type !== 'terminated' && action?.type !== 'extended') {
    return [];
  }

  const sortedRows = rows.slice().sort((a, b) => a.slotMinute - b.slotMinute);
  const latestRow = sortedRows[sortedRows.length - 1];
  const sessionStart = parseMonitoringDatetime(sessionStartIso) ?? new Date();
  const slotMinuteForDatetime = latestRow?.slotMinute ?? (action?.type === 'terminated' ? action.atSlotMinute : 0);
  const slotDatetime = new Date(sessionStart.getTime() + slotMinuteForDatetime * 60 * 1000);
  let slotIso = toMonitoringIsoString(action?.type === 'extended' ? new Date() : slotDatetime);
  const normalizedSessionStartIso = toMonitoringIsoString(sessionStart);
  const effectiveSlotMinutes = slotMinutes?.length ? slotMinutes : buildDefaultSlotMinutes();

  const obs: HaemodialysisObsInput[] = [];

  if (INCLUDE_STRUCTURED_MONITORING_NOTES) {
    const monitoringNotes = encodeMonitoringNotes({
      startedAt: normalizedSessionStartIso,
      rows: sortedRows,
      slotMinutes: effectiveSlotMinutes,
      action,
    });
    const nurseNotesObs = buildTextObs(C.postDialysis.postHdNurseNotes, monitoringNotes, slotIso);
    if (nurseNotesObs) {
      obs.push(nurseNotesObs);
    }
  }

  if (sortedRows.length === 1 && INCLUDE_CONNECTION_TIME_ON_FIRST_SLOT) {
    const connectionTimeObs = buildTextObs(
      C.connection.connectionTime,
      normalizedSessionStartIso,
      normalizedSessionStartIso,
    );
    if (connectionTimeObs) {
      obs.push(connectionTimeObs);
    }
  }

  if (
    INCLUDE_DEDICATED_MONITORING_CONCEPTS &&
    latestRow &&
    C.monitoring.bp &&
    C.monitoring.pulse &&
    C.monitoring.temp
  ) {
    obs.push(
      ...collectObs([
        buildTextObs(C.monitoring.bp, latestRow.bp, slotIso),
        buildNumericObs(C.monitoring.pulse, latestRow.pulse, slotIso),
        buildNumericObs(C.monitoring.temp, latestRow.temp, slotIso),
        buildNumericObs(C.monitoring.ufRemoved, latestRow.ufRemoved, slotIso),
        buildNumericObs(C.monitoring.heparin, latestRow.heparin, slotIso),
        buildTextObs(C.monitoring.remarks, latestRow.remarks, slotIso),
      ]),
    );
  }

  if (action && (action.type === 'terminated' || action.type === 'extended')) {
    const actionObs = buildMonitoringActionObs(action, slotIso, concepts);
    if (actionObs) {
      obs.push(actionObs);
    }
  }

  return obs;
};

const getGroupMemberValue = (obs: HaemodialysisEncounterObs, conceptUuid: string): string => {
  const member = obs.groupMembers?.find((item) => item.concept?.uuid === conceptUuid);
  return member ? normalizeValue(member.value) : '';
};

const hasMedicationRowContent = (row: AdditionalMedicationRow): boolean =>
  Boolean(row.name?.trim() || row.dosage?.trim() || row.administeredBy?.trim() || row.adverseEvent?.trim());

const buildMedicationObsGroup = (
  row: AdditionalMedicationRow,
  encounterDatetime: string,
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
): HaemodialysisObsInput | null => {
  const C = concepts;
  if (!hasMedicationRowContent(row)) {
    return null;
  }

  const groupMembers: HaemodialysisObsGroupMember[] = [];
  if (row.name?.trim()) {
    groupMembers.push({ concept: C.postDialysis.medicationName, value: row.name.trim() });
  }
  if (row.dosage?.trim()) {
    groupMembers.push({ concept: C.postDialysis.medicationDosage, value: row.dosage.trim() });
  }
  if (row.administeredBy?.trim()) {
    groupMembers.push({ concept: C.postDialysis.medicationAdministeredBy, value: row.administeredBy.trim() });
  }
  if (row.adverseEvent?.trim()) {
    groupMembers.push({ concept: C.postDialysis.medicationAdverseEvent, value: row.adverseEvent.trim() });
  }

  if (groupMembers.length === 0) {
    return null;
  }

  return {
    concept: C.postDialysis.medicationGroup,
    obsDatetime: encounterDatetime,
    groupMembers,
  };
};

const parseAdditionalMedications = (
  observations: HaemodialysisEncounterObs[],
  cutoffIso?: string,
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
): AdditionalMedicationRow[] => {
  const C = concepts;
  const cutoffMs = cutoffIso ? new Date(cutoffIso).getTime() : undefined;

  return observations
    .filter((obs) => obs.concept?.uuid === C.postDialysis.medicationGroup)
    .filter((obs) => {
      if (cutoffMs == null || Number.isNaN(cutoffMs)) {
        return true;
      }
      return new Date(obs.obsDatetime ?? 0).getTime() > cutoffMs;
    })
    .map((obs) => ({
      uuid: obs.uuid,
      name: getGroupMemberValue(obs, C.postDialysis.medicationName),
      dosage: getGroupMemberValue(obs, C.postDialysis.medicationDosage),
      administeredBy: getGroupMemberValue(obs, C.postDialysis.medicationAdministeredBy),
      adverseEvent: getGroupMemberValue(obs, C.postDialysis.medicationAdverseEvent),
    }))
    .filter(hasMedicationRowContent);
};

export const buildPostDialysisObs = (
  postDialysis: PostDialysisAssessment,
  summary: DialysisSummary,
  encounterDatetime: string,
  existingNurseNotes?: string,
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
): HaemodialysisObsInput[] => {
  const C = concepts;
  const postBp = splitBloodPressure(postDialysis.bloodPressure);
  const combinedNurseNotes = combinePostHdNurseNotes(existingNurseNotes, postDialysis.postHdNurseNotes);

  const candidates: Array<HaemodialysisObsInput | null> = [];

  if (isPostDialysisObsFieldEnabled('weightAfter')) {
    candidates.push(buildNumericObs(C.postDialysis.weightAfter, postDialysis.weightAfter, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('totalUfAchieved')) {
    candidates.push(buildNumericObs(C.postDialysis.totalUfAchieved, postDialysis.totalUfAchieved, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('bloodPressure')) {
    candidates.push(
      buildNumericObs(C.postDialysis.systolicBp, postBp.systolic, encounterDatetime),
      buildNumericObs(C.postDialysis.diastolicBp, postBp.diastolic, encounterDatetime),
    );
  }
  if (isPostDialysisObsFieldEnabled('pulse')) {
    candidates.push(buildNumericObs(C.postDialysis.pulse, postDialysis.pulse, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('temperature')) {
    candidates.push(buildNumericObs(C.postDialysis.temperature, postDialysis.temperature, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('accessSite')) {
    candidates.push(buildNumericObs(C.postDialysis.accessSite, postDialysis.accessSite, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('condition')) {
    candidates.push(buildTextObs(C.postDialysis.condition, postDialysis.condition, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('complications')) {
    candidates.push(buildTextObs(C.postDialysis.complications, postDialysis.complications, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('fluidBalance')) {
    candidates.push(buildNumericObs(C.postDialysis.fluidBalance, postDialysis.fluidBalance, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('additionalMedications')) {
    candidates.push(
      ...(postDialysis.additionalMedications ?? [])
        .map((row) => buildMedicationObsGroup(row, encounterDatetime, C))
        .filter((item): item is HaemodialysisObsInput => item != null),
    );
  }
  if (isPostDialysisObsFieldEnabled('postDialysisKtV')) {
    candidates.push(buildNumericObs(C.postDialysis.postDialysisKtV, postDialysis.postDialysisKtV, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('machineKtV')) {
    candidates.push(buildNumericObs(C.postDialysis.machineKtV, postDialysis.machineKtV, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('prescribedDuration')) {
    candidates.push(buildNumericObs(C.summary.prescribedDuration, summary.prescribedDuration, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('actualDuration')) {
    candidates.push(buildNumericObs(C.summary.actualDuration, summary.actualDuration, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('adequacyAchieved')) {
    candidates.push(
      buildCodedObs(
        C.summary.adequacyAchieved,
        summary.adequacyAchieved,
        encounterDatetime,
        YES_NO_OPTIONS.map((option) => option.value),
      ),
    );
  }
  if (isPostDialysisObsFieldEnabled('toleratedProcedure')) {
    candidates.push(
      buildCodedObs(
        C.summary.toleratedProcedure,
        summary.toleratedProcedure,
        encounterDatetime,
        YES_NO_OPTIONS.map((option) => option.value),
      ),
    );
  }
  if (isPostDialysisObsFieldEnabled('comments')) {
    candidates.push(buildTextObs(C.summary.comments, summary.comments, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('additionalRemarks')) {
    candidates.push(buildTextObs(C.summary.additionalRemarks, summary.additionalRemarks, encounterDatetime));
  }
  if (isPostDialysisObsFieldEnabled('postHdNurseNotes') && combinedNurseNotes.trim()) {
    candidates.push(buildTextObs(C.postDialysis.postHdNurseNotes, combinedNurseNotes, encounterDatetime));
  }

  return collectObs(candidates);
};

const sortObsByDatetimeAsc = (
  observations: HaemodialysisEncounterObs[],
  conceptUuid: string,
): HaemodialysisEncounterObs[] =>
  getObsByConcept(observations, conceptUuid).sort(
    (left, right) => new Date(left.obsDatetime ?? 0).getTime() - new Date(right.obsDatetime ?? 0).getTime(),
  );

const getLatestObsValue = (observations: HaemodialysisEncounterObs[], conceptUuid: string): string => {
  const matches = sortObsByDatetimeAsc(observations, conceptUuid);
  if (matches.length === 0) {
    return '';
  }
  return normalizeValue(matches[matches.length - 1].value);
};

const getFirstObsValue = (observations: HaemodialysisEncounterObs[], conceptUuid: string): string => {
  const matches = sortObsByDatetimeAsc(observations, conceptUuid);
  if (matches.length === 0) {
    return '';
  }
  return normalizeValue(matches[0].value);
};

const getNthObsValue = (observations: HaemodialysisEncounterObs[], conceptUuid: string, index: number): string => {
  const matches = sortObsByDatetimeAsc(observations, conceptUuid);
  if (matches.length <= index) {
    return '';
  }
  return normalizeValue(matches[index].value);
};

const getTextObsValues = (observations: HaemodialysisEncounterObs[], conceptUuid: string): string[] =>
  sortObsByDatetimeAsc(observations, conceptUuid)
    .map((obs) => normalizeValue(obs.value))
    .filter(Boolean);

const getMonitoringCutoffIso = (monitoringStartedAt?: string, connectionTime?: string): string | undefined => {
  const parsedStart = parseMonitoringDatetime(monitoringStartedAt);
  if (parsedStart) {
    return toMonitoringIsoString(parsedStart);
  }
  const parsedConnection = parseMonitoringDatetime(connectionTime);
  if (parsedConnection) {
    return toMonitoringIsoString(parsedConnection);
  }
  return undefined;
};

/** Latest obs for a concept recorded strictly after monitoring started. */
const getObsValueAfterCutoff = (
  observations: HaemodialysisEncounterObs[],
  conceptUuid: string,
  cutoffIso?: string,
): string => {
  if (!cutoffIso || !conceptUuid) {
    return '';
  }
  const cutoffMs = new Date(cutoffIso).getTime();
  if (Number.isNaN(cutoffMs)) {
    return '';
  }
  const matches = sortObsByDatetimeAsc(observations, conceptUuid).filter(
    (obs) => new Date(obs.obsDatetime ?? 0).getTime() > cutoffMs,
  );
  if (matches.length === 0) {
    return '';
  }
  return normalizeValue(matches[matches.length - 1].value);
};

const formatBloodPressure = (systolic: string, diastolic: string): string => {
  if (systolic && diastolic) {
    return `${systolic}/${diastolic}`;
  }
  return systolic || diastolic;
};

const getCodedObsValueAfterCutoff = (
  observations: HaemodialysisEncounterObs[],
  conceptUuid: string,
  cutoffIso?: string,
): string => {
  if (!cutoffIso || !conceptUuid) {
    return '';
  }
  const cutoffMs = new Date(cutoffIso).getTime();
  if (Number.isNaN(cutoffMs)) {
    return '';
  }
  const matches = sortObsByDatetimeAsc(observations, conceptUuid).filter(
    (obs) => new Date(obs.obsDatetime ?? 0).getTime() > cutoffMs,
  );
  if (matches.length === 0) {
    return '';
  }
  return getAllCodedObsValues([matches[matches.length - 1]], conceptUuid)[0] ?? '';
};

const getPostDialysisDetectionChecks = (
  concepts: HaemodialysisConceptMap,
): Array<{ concept: string; coded: boolean }> => {
  const C = concepts;
  return [
    { concept: C.postDialysis.totalUfAchieved, coded: false },
    { concept: C.postDialysis.condition, coded: false },
    { concept: C.postDialysis.complications, coded: false },
    { concept: C.postDialysis.fluidBalance, coded: false },
    { concept: C.postDialysis.postDialysisKtV, coded: false },
    { concept: C.postDialysis.machineKtV, coded: false },
    { concept: C.postDialysis.medicationGroup, coded: false },
    { concept: C.postDialysis.pulse, coded: false },
    { concept: C.postDialysis.temperature, coded: false },
    { concept: C.summary.prescribedDuration, coded: false },
    { concept: C.summary.actualDuration, coded: false },
    { concept: C.summary.adequacyAchieved, coded: true },
    { concept: C.summary.toleratedProcedure, coded: true },
    { concept: C.summary.comments, coded: false },
    { concept: C.summary.additionalRemarks, coded: false },
  ];
};

const hasConceptObsAfterCutoff = (
  observations: HaemodialysisEncounterObs[],
  concept: string,
  cutoff: string,
  coded: boolean,
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
): boolean => {
  const C = concepts;
  if (concept === C.postDialysis.medicationGroup) {
    return parseAdditionalMedications(observations, cutoff, concepts).length > 0;
  }
  if (coded) {
    return Boolean(getCodedObsValueAfterCutoff(observations, concept, cutoff));
  }
  return Boolean(getObsValueAfterCutoff(observations, concept, cutoff));
};

/** True when post-dialysis obs exist after intra-dialytic monitoring has started. */
export const hasPostDialysisAssessment = (
  observations: HaemodialysisEncounterObs[],
  monitoringStartedAt?: string,
  connectionTime?: string,
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
): boolean => {
  const C = concepts;
  const cutoff = getMonitoringCutoffIso(monitoringStartedAt, connectionTime);
  if (!cutoff) {
    return false;
  }

  if (
    getPostDialysisDetectionChecks(concepts).some(({ concept, coded }) =>
      hasConceptObsAfterCutoff(observations, concept, cutoff, coded, concepts),
    )
  ) {
    return true;
  }

  if (
    getObsValueAfterCutoff(observations, C.postDialysis.systolicBp, cutoff) ||
    getObsValueAfterCutoff(observations, C.postDialysis.diastolicBp, cutoff)
  ) {
    return true;
  }

  const weightObs = sortObsByDatetimeAsc(observations, C.preDialysis.weightBefore);
  const cutoffMs = new Date(cutoff).getTime();
  if (weightObs.some((obs) => new Date(obs.obsDatetime ?? 0).getTime() > cutoffMs)) {
    return true;
  }

  if (getObsValueAfterCutoff(observations, C.postDialysis.accessSite, cutoff)) {
    return true;
  }

  return false;
};

/** True when dialysis machine check obs exist on the encounter. */
export const hasMachineCheckAssessment = (
  observations: HaemodialysisEncounterObs[],
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
): boolean => {
  const C = concepts;
  if (
    getFirstObsValue(observations, C.machineChecks.machineCheckDate).length > 0 ||
    getCodedObsValue(observations, C.machineChecks.bloodLeaks).length > 0 ||
    getCodedObsValue(observations, C.machineChecks.airDetector).length > 0 ||
    getFirstObsValue(observations, C.machineChecks.conductivity).length > 0 ||
    getFirstObsValue(observations, C.machineChecks.transmembranePressure).length > 0 ||
    getFirstObsValue(observations, C.machineChecks.bloodLeakDateTime).length > 0 ||
    getFirstObsValue(observations, C.machineChecks.airDetectorDateTime).length > 0
  ) {
    return true;
  }

  const fluidTempObs = sortObsByDatetimeAsc(observations, C.machineChecks.dialysisFluidTemperature);
  return fluidTempObs.length > 1;
};

const getPostBloodPressure = (
  observations: HaemodialysisEncounterObs[],
  cutoffIso: string | undefined,
  concepts: HaemodialysisConceptMap,
): string => {
  const C = concepts;
  const systolic = getObsValueAfterCutoff(observations, C.postDialysis.systolicBp, cutoffIso);
  const diastolic = getObsValueAfterCutoff(observations, C.postDialysis.diastolicBp, cutoffIso);
  return formatBloodPressure(systolic, diastolic);
};

const getPreBloodPressure = (observations: HaemodialysisEncounterObs[], concepts: HaemodialysisConceptMap): string => {
  const C = concepts;
  const fromPreConcept = getFirstObsValue(observations, C.preDialysis.bloodPressure);
  if (fromPreConcept) {
    return fromPreConcept;
  }
  return formatBloodPressure(
    getFirstObsValue(observations, C.postDialysis.systolicBp),
    getFirstObsValue(observations, C.postDialysis.diastolicBp),
  );
};

const getDiagnosisLabelFromValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }
  if (typeof value === 'object' && 'uuid' in value) {
    const coded = value as { uuid: string; display?: string };
    return coded.display?.trim() || getCodedAnswerLabel(coded.uuid) || '';
  }
  const text = String(value).trim();
  if (!text) {
    return '';
  }
  if (isValidOpenmrsUuid(text)) {
    return getCodedAnswerLabel(text) || '';
  }
  return text;
};

const getDiagnosisFromObsGroup = (
  observations: HaemodialysisEncounterObs[],
  visitDiagnosis: VisitDiagnosisConceptMap = VISIT_DIAGNOSIS_CONCEPTS,
): string => {
  const D = visitDiagnosis;
  const construct = observations.find((obs) => isConcept(obs, D.construct));
  const problemMember = construct?.groupMembers?.find((member) => isConcept(member, D.problem));
  if (!problemMember?.value) {
    return '';
  }
  return getDiagnosisLabelFromValue(problemMember.value);
};

const getDiagnosisDisplay = (
  encounter: HaemodialysisEncounterResource,
  visitDiagnosis: VisitDiagnosisConceptMap = VISIT_DIAGNOSIS_CONCEPTS,
): string => {
  const coded = encounter.diagnoses?.[0]?.diagnosis?.coded;
  if (coded?.display?.trim()) {
    return coded.display.trim();
  }
  if (encounter.diagnoses?.[0]?.diagnosis?.nonCoded?.trim()) {
    return encounter.diagnoses[0].diagnosis.nonCoded.trim();
  }

  const fromObsGroup = getDiagnosisFromObsGroup(encounter.obs ?? [], visitDiagnosis);
  if (fromObsGroup) {
    return fromObsGroup;
  }

  if (coded?.uuid) {
    return getCodedAnswerLabel(coded.uuid) || '';
  }

  return '';
};

export const parseEncounterToSession = (
  encounter: HaemodialysisEncounterResource,
  patientUuid: string,
  biodata: PatientBiodata,
  facility: FacilityHeader,
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
  visitDiagnosis: VisitDiagnosisConceptMap = VISIT_DIAGNOSIS_CONCEPTS,
): HaemodialysisSession => {
  const C = concepts;
  const observations = encounter.obs ?? [];
  const nurseNotes = getLatestObsValue(observations, C.postDialysis.postHdNurseNotes);
  const monitoringFromNotes = pickBestMonitoringNotesParse(observations, C.postDialysis.postHdNurseNotes);
  const connectionTime = getLatestObsValue(observations, C.connection.connectionTime);
  const rawMonitoringStart = monitoringFromNotes.startedAt ?? connectionTime;
  const parsedMonitoringStart = parseMonitoringDatetime(rawMonitoringStart);
  const monitoringStartedAt = parsedMonitoringStart ? toMonitoringIsoString(parsedMonitoringStart) : undefined;
  const monitoringAction = resolveMonitoringSessionAction(
    monitoringFromNotes.action,
    parseMonitoringSessionActionFromObs(observations, C, monitoringStartedAt),
  );
  const monitoringCutoff = getMonitoringCutoffIso(monitoringStartedAt, connectionTime);
  const hasPostDialysis = hasPostDialysisAssessment(observations, monitoringStartedAt, connectionTime, concepts);
  const preBloodPressure = getPreBloodPressure(observations, concepts);

  const membraneType = getCodedObsValue(observations, C.prescription.membraneType);
  const dialysateComposition = getAllCodedObsValues(observations, C.prescription.dialysateComposition);
  const dialysateSelected = Array.isArray(dialysateComposition)
    ? dialysateComposition
    : dialysateComposition
    ? [dialysateComposition]
    : [];
  const sharedOtherTexts = getTextObsValues(observations, C.prescription.specifyOtherMembraneType);
  let sharedOtherIdx = 0;
  const specifyOtherMembraneType =
    membraneType === OTHERS_CONCEPT_ANSWER ? sharedOtherTexts[sharedOtherIdx++] : undefined;
  const dialysateCompositionOther = dialysateSelected.includes(OTHERS_CONCEPT_ANSWER)
    ? sharedOtherTexts[sharedOtherIdx++]
    : undefined;

  const signatures: SignatureBlock = {
    nurseName: encounter.encounterProviders?.[0]?.provider?.person?.display,
    doctorName: getLatestObsValue(observations, C.summary.doctorName),
    nurseDate: encounter.encounterDatetime?.slice(0, 10),
    doctorDate: encounter.encounterDatetime?.slice(0, 10),
  };

  return {
    encounterUuid: encounter.uuid,
    patientUuid,
    facility,
    biodata: {
      ...biodata,
      diagnosis: getDiagnosisDisplay(encounter, visitDiagnosis) || biodata.diagnosis,
      date: encounter.encounterDatetime?.slice(0, 10),
    },
    screening: {
      bloodGroup: getCodedObsValue(observations, C.screening.bloodGroup),
      hivStatus: getCodedObsValue(observations, C.screening.hivStatus),
      hepatitisCStatus: getCodedObsValue(observations, C.screening.hepatitisCStatus),
      hepatitisBStatus: getCodedObsValue(observations, C.screening.hepatitisBStatus),
      syphilisStatus: getCodedObsValue(observations, C.screening.syphilisStatus),
      drugAllergy: getFirstObsValue(observations, C.screening.drugAllergy),
    },
    preDialysis: {
      weightBefore: getFirstObsValue(observations, C.preDialysis.weightBefore),
      targetDryWeight: getFirstObsValue(observations, C.preDialysis.targetDryWeight),
      interdialyticWeightGain: getFirstObsValue(observations, C.preDialysis.interdialyticWeightGain),
      height: getFirstObsValue(observations, C.preDialysis.height),
      bodyMassIndex: getFirstObsValue(observations, C.preDialysis.bodyMassIndex),
      temperature: getFirstObsValue(observations, C.preDialysis.temperature),
      pulse: getFirstObsValue(observations, C.preDialysis.pulse),
      bloodPressure: preBloodPressure,
      respiratoryRate: getFirstObsValue(observations, C.preDialysis.respiratoryRate),
      oxygenSaturation: getFirstObsValue(observations, C.preDialysis.oxygenSaturation),
      bloodSugar: getFirstObsValue(observations, C.preDialysis.bloodSugar),
      accessType: getCodedObsValue(observations, C.preDialysis.accessType),
      additionalAssessment: getFirstObsValue(observations, C.preDialysis.additionalAssessment),
      accessSite: getFirstObsValue(observations, C.postDialysis.accessSite),
      doctorNephrologist: getFirstObsValue(observations, C.summary.doctorName),
    },
    prescription: {
      dialyzerType: getCodedObsValue(observations, C.prescription.dialyzerType),
      membraneType,
      specifyOtherMembraneType,
      fluxType: getCodedObsValue(observations, C.prescription.fluxType),
      dialyzerSize: getLatestObsValue(observations, C.prescription.dialyzerSize),
      prescribedFrequencyPerWeek: getLatestObsValue(observations, C.prescription.prescribedFrequencyPerWeek),
      bfr: getLatestObsValue(observations, C.prescription.bfr),
      dialysateComposition,
      acidConcentrateAmount: getLatestObsValue(observations, C.prescription.acidConcentrateAmount),
      sodiumBicarbonateConcentration: getLatestObsValue(observations, C.prescription.sodiumBicarbonateConcentration),
      potassiumBathConcentration: getLatestObsValue(observations, C.prescription.potassiumBathConcentration),
      dialysateCompositionOther,
      otherDialysateAmount: getLatestObsValue(observations, C.prescription.otherDialysateAmount),
      dfr: getLatestObsValue(observations, C.prescription.dfr),
      duration: getLatestObsValue(observations, C.summary.prescribedDuration),
      ufGoal: getLatestObsValue(observations, C.prescription.ufGoal),
      heparinDose: getLatestObsValue(observations, C.prescription.heparinDose),
    },
    machineCheck: hasMachineCheckAssessment(observations, concepts)
      ? {
          machineCheckDate: getFirstObsValue(observations, C.machineChecks.machineCheckDate),
          bloodLeaks: getCodedObsValue(observations, C.machineChecks.bloodLeaks),
          bloodLeakDateTime: getFirstObsValue(observations, C.machineChecks.bloodLeakDateTime),
          airDetector: getCodedObsValue(observations, C.machineChecks.airDetector),
          airDetectorDateTime: getFirstObsValue(observations, C.machineChecks.airDetectorDateTime),
          dialysisFluidTemperature: getNthObsValue(observations, C.machineChecks.dialysisFluidTemperature, 1),
          conductivity: getFirstObsValue(observations, C.machineChecks.conductivity),
          transmembranePressure: getFirstObsValue(observations, C.machineChecks.transmembranePressure),
        }
      : undefined,
    monitoringStartedAt,
    monitoringSlotMinutes: monitoringFromNotes.slotMinutes,
    monitoringAction,
    monitoring: monitoringFromNotes.rows,
    postDialysis: hasPostDialysis
      ? {
          weightAfter: getObsValueAfterCutoff(observations, C.postDialysis.weightAfter, monitoringCutoff),
          totalUfAchieved: getObsValueAfterCutoff(observations, C.postDialysis.totalUfAchieved, monitoringCutoff),
          bloodPressure: getPostBloodPressure(observations, monitoringCutoff, concepts),
          pulse: getObsValueAfterCutoff(observations, C.postDialysis.pulse, monitoringCutoff),
          temperature: getObsValueAfterCutoff(observations, C.postDialysis.temperature, monitoringCutoff),
          accessSite: getObsValueAfterCutoff(observations, C.postDialysis.accessSite, monitoringCutoff),
          condition: getObsValueAfterCutoff(observations, C.postDialysis.condition, monitoringCutoff),
          complications: getObsValueAfterCutoff(observations, C.postDialysis.complications, monitoringCutoff),
          fluidBalance: getObsValueAfterCutoff(observations, C.postDialysis.fluidBalance, monitoringCutoff),
          additionalMedications: parseAdditionalMedications(observations, monitoringCutoff, concepts),
          postDialysisKtV: getObsValueAfterCutoff(observations, C.postDialysis.postDialysisKtV, monitoringCutoff),
          machineKtV: getObsValueAfterCutoff(observations, C.postDialysis.machineKtV, monitoringCutoff),
          postHdNurseNotes: extractUserNurseNotes(nurseNotes),
        }
      : undefined,
    summary: hasPostDialysis
      ? {
          prescribedDuration: getObsValueAfterCutoff(observations, C.summary.prescribedDuration, monitoringCutoff),
          actualDuration: getObsValueAfterCutoff(observations, C.summary.actualDuration, monitoringCutoff),
          adequacyAchieved: getCodedObsValueAfterCutoff(observations, C.summary.adequacyAchieved, monitoringCutoff),
          toleratedProcedure: getCodedObsValueAfterCutoff(observations, C.summary.toleratedProcedure, monitoringCutoff),
          comments: getObsValueAfterCutoff(observations, C.summary.comments, monitoringCutoff),
          additionalRemarks: getObsValueAfterCutoff(observations, C.summary.additionalRemarks, monitoringCutoff),
        }
      : undefined,
    postHdNurseNotes: nurseNotes,
    signatures,
  };
};

export const hasEncounterMonitoring = (
  encounter: HaemodialysisEncounterResource,
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
): boolean => {
  const C = concepts;
  if (!encounter?.uuid) {
    return false;
  }
  const observations = encounter.obs ?? [];
  const nurseNotes = getLatestObsValue(observations, C.postDialysis.postHdNurseNotes);
  if (parseMonitoringNotes(nurseNotes).rows.length > 0) {
    return true;
  }
  return getLatestObsValue(observations, C.connection.connectionTime).length > 0;
};

export const hasEncounterInitialAssessment = (
  encounter: HaemodialysisEncounterResource,
  concepts: HaemodialysisConceptMap = HAEMODIALYSIS_CONCEPTS,
  visitDiagnosis: VisitDiagnosisConceptMap = VISIT_DIAGNOSIS_CONCEPTS,
): boolean => {
  const C = concepts;
  if (!encounter?.uuid) {
    return false;
  }
  const observations = encounter.obs ?? [];
  if (observations.length === 0) {
    return false;
  }
  return (
    getFirstObsValue(observations, C.preDialysis.weightBefore).length > 0 ||
    getFirstObsValue(observations, C.preDialysis.bloodPressure).length > 0 ||
    getFirstObsValue(observations, C.postDialysis.systolicBp).length > 0 ||
    getDiagnosisFromObsGroup(observations, visitDiagnosis).length > 0 ||
    getLatestObsValue(observations, C.prescription.dialyzerType).length > 0 ||
    getLatestObsValue(observations, C.prescription.bfr).length > 0
  );
};
