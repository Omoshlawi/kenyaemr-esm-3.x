import type { FieldItem } from '../components/shared/field-grid.component';
import type {
  AdditionalMedicationRow,
  DialysisMachineCheck,
  DialysisSummary,
  PhysicianPrescription,
  PostDialysisAssessment,
  PreDialysisAssessment,
  ScreeningStatus,
} from '../types';
import { getCodedAnswerLabel } from '../constants/coded-answers';
import { AIR_DETECTOR_OPTIONS, BLOOD_LEAK_OPTIONS } from '../constants/machine-check-answers';

export const displayValue = (value?: string | number | null): string => {
  if (value === undefined || value === null || value === '') {
    return '—';
  }
  return String(value);
};

const displayCodedValue = (value?: string | string[]): string => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return '—';
  }
  const values = Array.isArray(value) ? value : [value];
  const labels = values.map((item) => getCodedAnswerLabel(item) || item).filter(Boolean);
  return labels.length > 0 ? labels.join(', ') : '—';
};

export const screeningToFields = (data?: ScreeningStatus): FieldItem[] => [
  { label: 'Blood Group', value: displayCodedValue(data?.bloodGroup) },
  { label: 'HIV Status', value: displayCodedValue(data?.hivStatus) },
  { label: 'Hepatitis C Status', value: displayCodedValue(data?.hepatitisCStatus) },
  { label: 'Hepatitis B Status', value: displayCodedValue(data?.hepatitisBStatus) },
  { label: 'Syphilis Status', value: displayCodedValue(data?.syphilisStatus) },
  { label: 'Drug Allergy', value: displayValue(data?.drugAllergy), span: 2 },
];

export const preDialysisToFields = (data?: PreDialysisAssessment): FieldItem[] => [
  { label: 'Weight Before Dialysis', value: displayValue(data?.weightBefore) },
  { label: 'Target / Dry Weight', value: displayValue(data?.targetDryWeight) },
  { label: 'Inter-dialytic Weight Gain', value: displayValue(data?.interdialyticWeightGain) },
  { label: 'Height', value: displayValue(data?.height) },
  { label: 'Body Mass Index (BMI)', value: displayValue(data?.bodyMassIndex) },
  { label: 'Blood pressure before dialysis', value: displayValue(data?.bloodPressure) },
  { label: 'Pulse rate before dialysis', value: displayValue(data?.pulse) },
  { label: 'Temperature before dialysis', value: displayValue(data?.temperature) },
  { label: 'Respiratory rate before dialysis', value: displayValue(data?.respiratoryRate) },
  { label: 'Oxygen Saturation before dialysis', value: displayValue(data?.oxygenSaturation) },
  { label: 'Blood sugar before dialysis', value: displayValue(data?.bloodSugar) },
  { label: 'Types of Access', value: displayCodedValue(data?.accessType) },
  { label: 'Additional Pre-Dialysis Assessment', value: displayValue(data?.additionalAssessment), span: 2 },
  { label: 'Access Site', value: displayValue(data?.accessSite) },
  { label: 'Doctor/Nephrologist', value: displayValue(data?.doctorNephrologist) },
];

export const prescriptionToFields = (data?: PhysicianPrescription): FieldItem[] => [
  { label: 'Dialyzer Type', value: displayCodedValue(data?.dialyzerType) },
  { label: 'Dialyzer Membrane Type', value: displayCodedValue(data?.membraneType) },
  { label: 'Specify other membrane type', value: displayValue(data?.specifyOtherMembraneType) },
  { label: 'Flux Type', value: displayCodedValue(data?.fluxType) },
  { label: 'Dialyzer size', value: displayValue(data?.dialyzerSize) },
  { label: 'Prescribed Dialysis Frequency per Week', value: displayValue(data?.prescribedFrequencyPerWeek) },
  { label: 'Blood Flow Rate (BFR)', value: displayValue(data?.bfr) },
  { label: 'Dialysate composition', value: displayCodedValue(data?.dialysateComposition) },
  { label: 'Acid Concentrate Amount / Concentration', value: displayValue(data?.acidConcentrateAmount) },
  { label: 'Sodium Bicarbonate Concentration', value: displayValue(data?.sodiumBicarbonateConcentration) },
  { label: 'Potassium Concentration (K+ Bath)', value: displayValue(data?.potassiumBathConcentration) },
  { label: 'Specify other dialysate composition', value: displayValue(data?.dialysateCompositionOther) },
  { label: 'Other Dialysate Amount / Concentration', value: displayValue(data?.otherDialysateAmount) },
  { label: 'Dialysate Flow Rate (DFR)', value: displayValue(data?.dfr) },
  { label: 'Ultrafiltration Goal (UF Goal)', value: displayValue(data?.ufGoal) },
  { label: 'Heparin Dose', value: displayValue(data?.heparinDose) },
  { label: 'Duration', value: displayValue(data?.duration) },
];

const displayMachineCheckCoded = (value: string | undefined, options: typeof BLOOD_LEAK_OPTIONS): string => {
  if (!value?.trim()) {
    return '—';
  }
  return options.find((option) => option.value === value)?.label ?? value;
};

const formatMachineCheckDatetime = (value?: string): string => {
  if (!value?.trim()) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

export const machineCheckToFields = (data?: DialysisMachineCheck): FieldItem[] => [
  { label: 'Machine check date and time', value: formatMachineCheckDatetime(data?.machineCheckDate) },
  { label: 'Blood leaks', value: displayMachineCheckCoded(data?.bloodLeaks, BLOOD_LEAK_OPTIONS) },
  { label: 'Blood leak date and time', value: formatMachineCheckDatetime(data?.bloodLeakDateTime) },
  { label: 'Air Detector', value: displayMachineCheckCoded(data?.airDetector, AIR_DETECTOR_OPTIONS) },
  { label: 'Air detector date and time', value: formatMachineCheckDatetime(data?.airDetectorDateTime) },
  { label: 'Temperature (C) of dialysis fluid', value: displayValue(data?.dialysisFluidTemperature) },
  { label: 'Conductivity', value: displayValue(data?.conductivity) },
  { label: 'Transmembrane pressure (TMP)', value: displayValue(data?.transmembranePressure) },
];

const formatAdditionalMedications = (rows?: AdditionalMedicationRow[]): string => {
  if (!rows?.length) {
    return '—';
  }

  const formatted = rows
    .map((row, index) => {
      const parts = [
        row.name ? `Name: ${row.name}` : '',
        row.dosage ? `Dosage: ${row.dosage}` : '',
        row.administeredBy ? `By: ${row.administeredBy}` : '',
        row.adverseEvent ? `Adverse event: ${row.adverseEvent}` : '',
      ].filter(Boolean);
      return parts.length > 0 ? `${index + 1}. ${parts.join('; ')}` : '';
    })
    .filter(Boolean);

  return formatted.length > 0 ? formatted.join('\n') : '—';
};

export const postDialysisToFields = (data?: PostDialysisAssessment): FieldItem[] => [
  { label: 'Weight after dialysis', value: displayValue(data?.weightAfter) },
  { label: 'Total UF Achieved', value: displayValue(data?.totalUfAchieved) },
  { label: 'Blood pressure after dialysis', value: displayValue(data?.bloodPressure) },
  { label: 'Pulse Rate After Dialysis', value: displayValue(data?.pulse) },
  { label: 'Temperature After Dialysis', value: displayValue(data?.temperature) },
  { label: 'Access Site', value: displayValue(data?.accessSite) },
  { label: 'Condition', value: displayValue(data?.condition) },
  { label: 'Dialysis Complications', value: displayValue(data?.complications) },
  { label: 'Fluid balance', value: displayValue(data?.fluidBalance) },
  {
    label: 'Additional Medication Prescribed / Administered',
    value: formatAdditionalMedications(data?.additionalMedications),
    span: 2,
  },
  { label: 'Post-Dialysis Kt/V', value: displayValue(data?.postDialysisKtV) },
  { label: 'Machine Kt/V', value: displayValue(data?.machineKtV) },
  { label: "Post-HD Nurse's Notes", value: displayValue(data?.postHdNurseNotes), span: 2 },
];

export const summaryToFields = (data?: DialysisSummary): FieldItem[] => [
  { label: 'Prescribed Duration', value: displayValue(data?.prescribedDuration) },
  { label: 'Actual Duration', value: displayValue(data?.actualDuration) },
  { label: 'Adequacy Achieved', value: displayCodedValue(data?.adequacyAchieved) },
  { label: 'Tolerated Procedure', value: displayCodedValue(data?.toleratedProcedure) },
];
