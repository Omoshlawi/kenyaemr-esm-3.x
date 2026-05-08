import { restBaseUrl } from '@openmrs/esm-framework';

export const PREAUTH_TYPE_COLORS: Record<string, 'blue' | 'cyan' | 'purple' | 'teal' | 'magenta' | 'gray'> = {
  NORMAL: 'blue',
  SURGICAL: 'purple',
  RENAL: 'cyan',
  ONCOLOGY: 'magenta',
  IMAGING: 'teal',
  OPTICAL: 'gray',
  NONE: 'gray',
};

export const WORKFLOW_STATE_COLORS: Record<string, 'blue' | 'cyan' | 'green' | 'red' | 'warm-gray'> = {
  ELECTIVE_DRAFT: 'warm-gray',
  ELECTIVE_PENDING: 'cyan',
  ELECTIVE_APPROVED: 'green',
  ELECTIVE_REJECTED: 'red',
};

export const DOCUMENT_TYPES = [
  'LAB_ORDER',
  'LAB_RESULTS',
  'LAB_TESTS',
  'FINAL_BILL',
  'INTERIM_BILL',
  'CLAIM_FORM',
  'PREAUTH_FORM',
  'DISCHARGE_SUMMARY',
  'REFERRAL_LETTER',
  'CLINICAL_DOCUMENTATION',
  'PRESCRIPTION',
  'THEATRE_LIST',
  'THEATRE_NOTES',
  'IMAGING_ORDER',
  'IMAGING_RESULT',
  'RADIOLOGY_REQUEST',
  'RADIOLOGICAL_EXAM',
  'PRIOR_BASIC_DIAGNOSTIC_IMAGES',
  'ULTRASOUND',
  'BIOPSY_RESULT',
  'HISTOPATHOLOGY_RESULTS',
  'STAGING_RESULTS',
  'TREATMENT_PLAN',
  'DIALYSIS_CHART',
  'CONSULTANT_REPORT',
  'MEDICAL_REPORT',
  'CASE_SUMMARY',
  'CASE_NOTES_JUSTIFYING_ADMISSION',
  'CRITICAL_CARE_UNIT_CASE_NOTES',
  'PROFORMA_INVOICE',
  'KMPDC_FORM',
  'LOU',
  'OTHER',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const ANAESTHESIA_TYPES = ['GENERAL', 'LOCAL', 'REGIONAL', 'SPINAL', 'EPIDURAL'] as const;
export const FREQUENCY_OPTIONS = ['ONCE_A_WEEK', 'TWICE_A_WEEK', 'ONCE_A_MONTH', 'DAILY'] as const;
export const CARCINOMA_STAGES = ['STAGE_1', 'STAGE_2', 'STAGE_3', 'STAGE_4'] as const;
export const METASTASES_OPTIONS = ['LUNG', 'LIVER', 'BONE', 'BRAIN', 'LYMPH_NODES'] as const;
export const TREATMENT_SETTINGS = ['DAY_WARD', 'INPATIENT', 'OUTPATIENT'] as const;
export const LENS_PRESCRIPTIONS = ['FRAMES_LENSES', 'CONTACT_LENSES', 'LENSES_ONLY'] as const;

export const virtualClaimBaseUrl = `${restBaseUrl}/virtualclaims`;
