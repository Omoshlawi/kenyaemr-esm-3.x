import type {
  DialysisMachineCheck,
  DialysisSummary,
  PostDialysisAssessment,
  PreDialysisAssessment,
  PhysicianPrescription,
  ScreeningStatus,
} from '../types';
import {
  INITIAL_PRE_DIALYSIS_FIELDS,
  INITIAL_PRESCRIPTION_FIELDS,
  MACHINE_CHECK_FIELDS,
  POST_DIALYSIS_FIELDS,
  SCREENING_FIELDS,
  SUMMARY_FIELDS,
} from '../constants/field-definitions';
import { isInitialObsFieldEnabled, type InitialObsFieldKey } from '../constants/initial-obs-flags';
import { isMachineCheckObsFieldEnabled, type MachineCheckObsFieldKey } from '../constants/machine-check-obs-flags';
import { isScreeningObsFieldEnabled, type ScreeningObsFieldKey } from '../constants/screening-obs-flags';
import { AIR_DETECTED_ANSWER, BLOOD_LEAK_DETECTED_ANSWER } from '../constants/machine-check-answers';
import {
  DIALYSATE_ACID_CONCENTRATE_ANSWER,
  DIALYSATE_POTASSIUM_BATH_ANSWER,
  DIALYSATE_SODIUM_BICARBONATE_ANSWER,
  OTHERS_CONCEPT_ANSWER,
} from '../constants/coded-answers';
import { INCLUDE_ICD11_DIAGNOSIS_OBS } from '../constants/encounter-post-flags';
import { isValidOpenmrsUuid } from './openmrs-uuid';
import { validateFieldDef } from './field-validation';

const getDialysateSelections = (value?: string | string[]): string[] => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const dialysateIncludes = (value: string | string[] | undefined, answer: string): boolean =>
  getDialysateSelections(value).includes(answer);

const isPrescriptionFieldVisible = (key: InitialObsFieldKey, prescription: PhysicianPrescription): boolean => {
  switch (key) {
    case 'specifyOtherMembraneType':
      return prescription.membraneType === OTHERS_CONCEPT_ANSWER;
    case 'acidConcentrateAmount':
      return dialysateIncludes(prescription.dialysateComposition, DIALYSATE_ACID_CONCENTRATE_ANSWER);
    case 'sodiumBicarbonateConcentration':
      return dialysateIncludes(prescription.dialysateComposition, DIALYSATE_SODIUM_BICARBONATE_ANSWER);
    case 'potassiumBathConcentration':
      return dialysateIncludes(prescription.dialysateComposition, DIALYSATE_POTASSIUM_BATH_ANSWER);
    case 'dialysateCompositionOther':
    case 'otherDialysateAmount':
      return dialysateIncludes(prescription.dialysateComposition, OTHERS_CONCEPT_ANSWER);
    default:
      return true;
  }
};

export type HaemodialysisDiagnosis = {
  uuid: string;
  display: string;
};

export type InitialAssessmentFormValues = {
  diagnosis: HaemodialysisDiagnosis | null;
  sessionDate: string;
  screening: ScreeningStatus;
  preDialysis: PreDialysisAssessment;
  prescription: PhysicianPrescription;
};

export const validateInitialAssessment = (values: InitialAssessmentFormValues): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (INCLUDE_ICD11_DIAGNOSIS_OBS) {
    if (!values.diagnosis?.uuid?.trim()) {
      errors.diagnosis = 'ICD-11 diagnosis is required';
    } else if (!isValidOpenmrsUuid(values.diagnosis.uuid.trim())) {
      errors.diagnosis = 'Selected diagnosis is not a valid OpenMRS concept. Pick a result from the search list.';
    }
  }
  if (!values.sessionDate?.trim()) {
    errors.sessionDate = 'Date is required';
  }

  (
    Object.entries(SCREENING_FIELDS) as Array<
      [ScreeningObsFieldKey, (typeof SCREENING_FIELDS)[keyof typeof SCREENING_FIELDS]]
    >
  ).forEach(([key, def]) => {
    if (!isScreeningObsFieldEnabled(key)) {
      return;
    }
    const message = validateFieldDef(def, values.screening?.[key]);
    if (message) {
      errors[`screening.${key}`] = message;
    }
  });

  (
    Object.entries(INITIAL_PRE_DIALYSIS_FIELDS) as Array<
      [InitialObsFieldKey, (typeof INITIAL_PRE_DIALYSIS_FIELDS)[keyof typeof INITIAL_PRE_DIALYSIS_FIELDS]]
    >
  ).forEach(([key, def]) => {
    if (!isInitialObsFieldEnabled(key)) {
      return;
    }
    const message = validateFieldDef(def, values.preDialysis?.[key]);
    if (message) {
      errors[key] = message;
    }
  });

  (
    Object.entries(INITIAL_PRESCRIPTION_FIELDS) as Array<
      [InitialObsFieldKey, (typeof INITIAL_PRESCRIPTION_FIELDS)[keyof typeof INITIAL_PRESCRIPTION_FIELDS]]
    >
  ).forEach(([key, def]) => {
    if (!isInitialObsFieldEnabled(key)) {
      return;
    }
    if (!isPrescriptionFieldVisible(key, values.prescription ?? {})) {
      return;
    }
    const message = validateFieldDef(def, values.prescription?.[key]);
    if (message) {
      errors[`prescription.${key}`] = message;
    }
  });

  return errors;
};

export type MachineCheckFormValues = DialysisMachineCheck;

export const validateMachineCheck = (values: MachineCheckFormValues): Record<string, string> => {
  const errors: Record<string, string> = {};

  (
    Object.entries(MACHINE_CHECK_FIELDS) as Array<
      [MachineCheckObsFieldKey, (typeof MACHINE_CHECK_FIELDS)[keyof typeof MACHINE_CHECK_FIELDS]]
    >
  ).forEach(([key, def]) => {
    if (!isMachineCheckObsFieldEnabled(key)) {
      return;
    }
    if (key === 'bloodLeakDateTime' && values.bloodLeaks !== BLOOD_LEAK_DETECTED_ANSWER) {
      return;
    }
    if (key === 'airDetectorDateTime' && values.airDetector !== AIR_DETECTED_ANSWER) {
      return;
    }
    const message = validateFieldDef(def, values[key]);
    if (message) {
      errors[key] = message;
    }
  });

  return errors;
};

export type PostDialysisFormValues = {
  postDialysis: PostDialysisAssessment;
  summary: DialysisSummary;
};

export const validatePostDialysisAssessment = (values: PostDialysisFormValues): Record<string, string> => {
  const errors: Record<string, string> = {};

  (
    Object.entries(POST_DIALYSIS_FIELDS) as Array<
      [keyof typeof POST_DIALYSIS_FIELDS, (typeof POST_DIALYSIS_FIELDS)[keyof typeof POST_DIALYSIS_FIELDS]]
    >
  ).forEach(([key, def]) => {
    const message = validateFieldDef(def, values.postDialysis?.[key]);
    if (message) {
      errors[key] = message;
    }
  });

  (
    Object.entries(SUMMARY_FIELDS) as Array<
      [keyof DialysisSummary, (typeof SUMMARY_FIELDS)[keyof typeof SUMMARY_FIELDS]]
    >
  ).forEach(([key, def]) => {
    const message = validateFieldDef(def, values.summary?.[key]);
    if (message) {
      errors[`summary.${key}`] = message;
    }
  });

  return errors;
};
