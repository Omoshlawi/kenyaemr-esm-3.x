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
  'FINAL_BILL',
  'CLAIM_FORM',
  'DISCHARGE_SUMMARY',
  'REFERRAL_LETTER',
  'CLINICAL_NOTES',
  'PRESCRIPTION',
  'LAB_TESTS',
];
export const ANAESTHESIA_TYPES = ['GENERAL', 'LOCAL', 'REGIONAL', 'SPINAL', 'EPIDURAL'];
export const FREQUENCY_OPTIONS = ['ONCE_A_WEEK', 'TWICE_A_WEEK', 'ONCE_A_MONTH', 'DAILY'];
export const CARCINOMA_STAGES = ['STAGE_1', 'STAGE_2', 'STAGE_3', 'STAGE_4'];
export const METASTASES_OPTIONS = ['LUNG', 'LIVER', 'BONE', 'BRAIN', 'LYMPH_NODES'];
export const TREATMENT_SETTINGS = ['DAY_WARD', 'INPATIENT', 'OUTPATIENT'];
export const LENS_PRESCRIPTIONS = ['FRAMES_LENSES', 'CONTACT_LENSES', 'LENSES_ONLY'];

export const virtualClaimBaseUrl = `${restBaseUrl}/virtualclaims`;
