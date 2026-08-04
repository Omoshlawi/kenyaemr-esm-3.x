export type CodedAnswerOption = {
  label: string;
  value: string;
};

export const ACCESS_TYPE_OPTIONS: CodedAnswerOption[] = [
  { label: 'Arteriovenous (AV) fistula', value: '123310AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'AV (Arteriovenous) Graft', value: '6bdf4253-67fa-4a02-8730-2585a2caa76a' },
  { label: 'Central Venous catheter', value: '162625AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'Peritoneal catheter', value: '464f81c1-48d5-4d84-9f80-e19f7f4214f5' },
];

export const DIALYZER_TYPE_OPTIONS: CodedAnswerOption[] = [
  { label: 'Standard', value: '53ae87fd-c697-4a62-a93e-cfddd9f1b0db' },
  { label: 'High-performance', value: '7b00ddbe-f159-4892-8745-bb67b0c07975' },
];

export const DIALYSATE_COMPOSITION_OPTIONS: CodedAnswerOption[] = [
  { label: 'Acid Concentrate', value: '902f0398-1b22-45df-8a88-bd75475da697' },
  { label: 'Sodium Bicarbonate', value: '162861AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'Potassium concentration (K+ Bath)', value: 'f7572a5a-5e88-40ec-8bff-91d967f488f0' },
  { label: 'Others', value: '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
];

export const OTHERS_CONCEPT_ANSWER = '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export const DIALYSATE_ACID_CONCENTRATE_ANSWER = '902f0398-1b22-45df-8a88-bd75475da697';

export const DIALYSATE_SODIUM_BICARBONATE_ANSWER = '162861AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export const DIALYSATE_POTASSIUM_BATH_ANSWER = 'f7572a5a-5e88-40ec-8bff-91d967f488f0';

export const MEMBRANE_TYPE_OPTIONS: CodedAnswerOption[] = [
  { label: 'Cellulose-based', value: '73062AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'Synthetic', value: '782cdf23-b58b-429c-9a08-952ee8dc7825' },
  { label: 'Others', value: OTHERS_CONCEPT_ANSWER },
];

export const FLUX_TYPE_OPTIONS: CodedAnswerOption[] = [
  { label: 'High flux membrane', value: '02485c94-503c-4b96-95ac-72b28eb75e18' },
  { label: 'Low-flux membrane', value: '64cc59f5-71fd-4eba-aacf-1d0f2dbf7861' },
];

export const YES_NO_OPTIONS: CodedAnswerOption[] = [
  { label: 'Yes', value: '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'No', value: '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
];

/** Screening status coded answers (Ampath pre-dialysis form). */
export const BLOOD_GROUP_OPTIONS: CodedAnswerOption[] = [
  { label: 'A positive', value: '690AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'A Negative', value: '692AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'B positive', value: '694AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'B Negative', value: '696AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'AB positive', value: '1230AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'AB Negative', value: '1231AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'O positive', value: '699AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'O Negative', value: '701AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
];

export const HIV_STATUS_OPTIONS: CodedAnswerOption[] = [
  { label: 'Positive', value: '138571AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'Negative', value: '1404AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'Unknown', value: '1067AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
];

export const HEPATITIS_C_STATUS_OPTIONS: CodedAnswerOption[] = [
  { label: 'Positive', value: '703AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'Negative', value: '664AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'Unknown', value: '1067AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
];

export const HEPATITIS_B_STATUS_OPTIONS: CodedAnswerOption[] = [
  { label: 'Positive', value: '111759AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'Negative', value: '664AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'Unknown', value: '1067AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
];

export const SYPHILIS_STATUS_OPTIONS: CodedAnswerOption[] = [
  { label: 'Positive', value: '703AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'Negative', value: '664AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
  { label: 'Unknown', value: '1067AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
];

import { AIR_DETECTOR_OPTIONS, BLOOD_LEAK_OPTIONS } from './machine-check-answers';

const ALL_OPTIONS: CodedAnswerOption[] = [
  ...ACCESS_TYPE_OPTIONS,
  ...DIALYZER_TYPE_OPTIONS,
  ...MEMBRANE_TYPE_OPTIONS,
  ...FLUX_TYPE_OPTIONS,
  ...DIALYSATE_COMPOSITION_OPTIONS,
  ...YES_NO_OPTIONS,
  ...BLOOD_GROUP_OPTIONS,
  ...HIV_STATUS_OPTIONS,
  ...HEPATITIS_C_STATUS_OPTIONS,
  ...HEPATITIS_B_STATUS_OPTIONS,
  ...SYPHILIS_STATUS_OPTIONS,
  ...BLOOD_LEAK_OPTIONS,
  ...AIR_DETECTOR_OPTIONS,
];

const normalizeConceptUuid = (uuid: string): string => uuid.trim().toUpperCase().replace(/-/g, '');

export const isLikelyConceptUuid = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return true;
  }
  const compact = normalizeConceptUuid(trimmed);
  if (/^[0-9A-F]{32}$/.test(compact)) {
    return true;
  }
  return /^[0-9]+A+$/i.test(trimmed);
};

export const getCodedAnswerLabel = (conceptUuid?: string): string => {
  if (!conceptUuid?.trim()) {
    return '';
  }
  const normalized = normalizeConceptUuid(conceptUuid);
  return ALL_OPTIONS.find((option) => normalizeConceptUuid(option.value) === normalized)?.label ?? '';
};
