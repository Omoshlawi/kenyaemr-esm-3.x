/**
 * Numeric absolute ranges enforced by OpenMRS on this server (beyond UI defaults).
 * Mismatches cause 400: error.value.outOfRange.low / .high
 */
export type ConceptNumericRange = {
  label: string;
  min: number;
  max: number;
  units?: string;
};

export const CONCEPT_SERVER_NUMERIC_RANGES: Record<string, ConceptNumericRange> = {
  '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': { label: 'Weight', min: 0, max: 250, units: 'kg' },
  '480ea417-eab0-4207-9840-a1e18cd9fefe': { label: 'Target / dry weight', min: 0, max: 250, units: 'kg' },
  '8f372692-bd3f-4f16-8da3-ff7e048fd596': { label: 'Inter-dialytic weight gain', min: 0, max: 250, units: 'kg' },
  '163554AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': { label: 'Height', min: 10, max: 272, units: 'cm' },
  '1342AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': { label: 'BMI', min: 0, max: 100 },
  '5087AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': { label: 'Pulse', min: 0, max: 230, units: 'bpm' },
  '5088AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': { label: 'Temperature', min: 35, max: 43, units: '°C' },
  '5242AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': { label: 'Respiratory rate', min: 5, max: 60, units: '/min' },
  '5092AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': { label: 'Oxygen saturation', min: 50, max: 100, units: '%' },
  '5085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': { label: 'Systolic BP', min: 40, max: 300, units: 'mmHg' },
  '5086AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': { label: 'Diastolic BP', min: 20, max: 200, units: 'mmHg' },
  '163381AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': { label: 'Pulse', min: 0, max: 230, units: 'bpm' },
  '8542c14f-5099-4ea6-acce-1c67c294b49a': { label: 'Temperature', min: 35, max: 43, units: '°C' },
  '162661AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': { label: 'Total UF Achieved', min: 0, max: 10000, units: 'mL' },
};

export const getConceptServerRange = (conceptUuid: string): ConceptNumericRange | undefined =>
  CONCEPT_SERVER_NUMERIC_RANGES[conceptUuid];
