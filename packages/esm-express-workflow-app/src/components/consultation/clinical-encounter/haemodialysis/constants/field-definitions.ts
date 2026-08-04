/**
 * Field metadata aligned with Haemodialysis Flow Chart test (v1.2) questionOptions.
 * Drives UI input type, client validation, and REST obs value shape.
 */

export type ObsValueKind = 'numeric' | 'text' | 'coded';

export type NumericFieldDef = {
  kind: 'numeric';
  label: string;
  min?: number;
  max?: number;
  step?: number;
  units?: string;
  required?: boolean;
  helperText?: string;
};

export type TextFieldDef = {
  kind: 'text';
  label: string;
  /** BP-style: single number or systolic/diastolic */
  pattern?: 'bloodPressure' | 'freeText';
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  helperText?: string;
};

export type CodedFieldDef = {
  kind: 'coded';
  label: string;
  /** radio = single select; checkbox = multi-select */
  rendering: 'radio' | 'checkbox';
  required?: boolean;
};

export type FieldDef = NumericFieldDef | TextFieldDef | CodedFieldDef;

/** Prescription keys aligned with InitialObsFieldKey in initial-obs-flags.ts */
export type InitialPrescriptionFieldKey =
  | 'dialyzerType'
  | 'membraneType'
  | 'specifyOtherMembraneType'
  | 'fluxType'
  | 'dialyzerSize'
  | 'prescribedFrequencyPerWeek'
  | 'bfr'
  | 'dialysateComposition'
  | 'acidConcentrateAmount'
  | 'sodiumBicarbonateConcentration'
  | 'potassiumBathConcentration'
  | 'dialysateCompositionOther'
  | 'otherDialysateAmount'
  | 'dfr'
  | 'ufGoal'
  | 'heparinDose'
  | 'duration';

export const SCREENING_FIELDS = {
  bloodGroup: { kind: 'coded', label: 'Blood Group', rendering: 'radio', required: true },
  hivStatus: { kind: 'coded', label: 'HIV Status', rendering: 'radio', required: true },
  hepatitisCStatus: { kind: 'coded', label: 'Hepatitis C Status', rendering: 'radio', required: true },
  hepatitisBStatus: { kind: 'coded', label: 'Hepatitis B Status', rendering: 'radio', required: true },
  syphilisStatus: { kind: 'coded', label: 'Syphilis Status', rendering: 'radio', required: true },
  drugAllergy: { kind: 'text', label: 'Drug Allergy', pattern: 'freeText' },
} as const satisfies Record<string, FieldDef>;

export const INITIAL_PRE_DIALYSIS_FIELDS = {
  weightBefore: {
    kind: 'numeric',
    label: 'Weight Before Dialysis',
    min: 0,
    max: 250,
    units: 'kg',
    required: true,
  },
  targetDryWeight: {
    kind: 'numeric',
    label: 'Target / Dry Weight',
    min: 0,
    max: 250,
    units: 'kg',
    required: true,
  },
  interdialyticWeightGain: {
    kind: 'numeric',
    label: 'Inter-dialytic Weight Gain',
    min: 0,
    max: 250,
    units: 'kg',
  },
  height: {
    kind: 'numeric',
    label: 'Height',
    min: 10,
    max: 272,
    units: 'cm',
    required: true,
  },
  bodyMassIndex: {
    kind: 'numeric',
    label: 'Body Mass Index (BMI)',
    min: 0,
    step: 0.1,
    helperText: 'Auto-calculated from weight before dialysis and height',
  },
  bloodPressure: {
    kind: 'text',
    label: 'Blood pressure before dialysis',
    pattern: 'bloodPressure',
    required: true,
    helperText: 'Systolic/diastolic before dialysis (e.g. 120/80)',
  },
  pulse: {
    kind: 'numeric',
    label: 'Pulse rate before dialysis',
    min: 0,
    max: 230,
    units: 'bpm',
    required: true,
  },
  temperature: {
    kind: 'numeric',
    label: 'Temperature before dialysis',
    min: 25,
    max: 43,
    units: '°C',
    required: true,
    helperText: 'Body temperature (25–43 °C)',
  },
  respiratoryRate: {
    kind: 'numeric',
    label: 'Respiratory rate before dialysis',
    min: 5,
    max: 60,
    units: '/min',
    required: true,
  },
  oxygenSaturation: {
    kind: 'numeric',
    label: 'Oxygen Saturation before dialysis',
    min: 50,
    max: 100,
    units: '%',
    required: true,
    helperText: 'SpO₂ (50–100%)',
  },
  bloodSugar: {
    kind: 'numeric',
    label: 'Blood sugar before dialysis',
    min: 0,
    step: 0.1,
  },
  accessType: {
    kind: 'coded',
    label: 'Types of Access',
    rendering: 'radio',
    required: true,
  },
  additionalAssessment: {
    kind: 'text',
    label: 'Additional Pre-Dialysis Assessment',
    pattern: 'freeText',
  },
  accessSite: {
    kind: 'numeric',
    label: 'Access Site',
    min: 0,
  },
  doctorNephrologist: {
    kind: 'text',
    label: 'Doctor/Nephrologist',
    pattern: 'freeText',
  },
} as const satisfies Record<string, FieldDef>;

export const INITIAL_PRESCRIPTION_FIELDS = {
  dialyzerType: {
    kind: 'coded',
    label: 'Dialyzer Type',
    rendering: 'radio',
    required: true,
  },
  membraneType: {
    kind: 'coded',
    label: 'Dialyzer Membrane Type',
    rendering: 'radio',
    required: true,
  },
  specifyOtherMembraneType: {
    kind: 'text',
    label: 'Specify other membrane type',
    pattern: 'freeText',
    required: true,
  },
  fluxType: {
    kind: 'coded',
    label: 'Flux Type',
    rendering: 'radio',
    required: true,
  },
  dialyzerSize: {
    kind: 'numeric',
    label: 'Dialyzer size',
    min: 0,
    units: 'm²',
    required: true,
  },
  prescribedFrequencyPerWeek: {
    kind: 'numeric',
    label: 'Prescribed Dialysis Frequency per Week',
    min: 0,
    units: 'sessions/week',
    required: true,
  },
  bfr: {
    kind: 'numeric',
    label: 'Blood Flow Rate (BFR)',
    min: 0,
    units: 'mL/min',
    required: true,
  },
  dialysateComposition: {
    kind: 'coded',
    label: 'Dialysate composition',
    rendering: 'checkbox',
    required: true,
  },
  acidConcentrateAmount: {
    kind: 'numeric',
    label: 'Acid Concentrate Amount / Concentration',
    min: 0,
    required: true,
  },
  sodiumBicarbonateConcentration: {
    kind: 'numeric',
    label: 'Sodium Bicarbonate Concentration',
    min: 0,
    units: 'mmol/L',
    required: true,
  },
  potassiumBathConcentration: {
    kind: 'numeric',
    label: 'Potassium Concentration (K+ Bath)',
    min: 0,
    units: 'mmol/L',
    required: true,
  },
  dialysateCompositionOther: {
    kind: 'text',
    label: 'Specify other dialysate composition',
    pattern: 'freeText',
    required: true,
  },
  otherDialysateAmount: {
    kind: 'text',
    label: 'Other Dialysate Amount / Concentration',
    pattern: 'freeText',
    required: true,
  },
  dfr: {
    kind: 'numeric',
    label: 'Dialysate Flow Rate (DFR)',
    min: 0,
    units: 'mL/min',
    required: true,
  },
  ufGoal: {
    kind: 'numeric',
    label: 'Ultrafiltration Goal (UF Goal)',
    min: 0,
    units: 'mL',
    required: true,
  },
  heparinDose: {
    kind: 'numeric',
    label: 'Heparin Dose',
    min: 0,
    units: 'IU',
    required: true,
  },
  duration: {
    kind: 'numeric',
    label: 'Duration',
    min: 0,
    max: 24,
    step: 0.5,
    units: 'hours',
  },
} as const satisfies Record<InitialPrescriptionFieldKey, FieldDef>;

export const MACHINE_CHECK_FIELDS = {
  machineCheckDate: {
    kind: 'text',
    label: 'Machine check date and time',
    helperText: 'Date of machine check',
  },
  bloodLeaks: {
    kind: 'coded',
    label: 'Blood leaks',
    rendering: 'radio',
  },
  bloodLeakDateTime: {
    kind: 'text',
    label: 'Blood leak date and time',
    helperText: 'Required when leaks are detected',
  },
  airDetector: {
    kind: 'coded',
    label: 'Air Detector',
    rendering: 'radio',
  },
  airDetectorDateTime: {
    kind: 'text',
    label: 'Air detector date and time',
    helperText: 'Required when air is detected',
  },
  dialysisFluidTemperature: {
    kind: 'numeric',
    label: 'Temperature (C) of dialysis fluid',
    min: 25,
    max: 43,
    units: '°C',
  },
  conductivity: {
    kind: 'numeric',
    label: 'Conductivity',
    min: 0,
    units: 'mS/cm',
  },
  transmembranePressure: {
    kind: 'numeric',
    label: 'Transmembrane pressure (TMP)',
    min: 0,
    units: 'mmHg',
  },
} as const satisfies Record<string, FieldDef>;

export const POST_DIALYSIS_FIELDS = {
  weightAfter: { kind: 'numeric', label: 'Weight after dialysis', min: 0, max: 250, units: 'kg' },
  totalUfAchieved: { kind: 'numeric', label: 'Total UF Achieved', min: 0, units: 'mL' },
  bloodPressure: {
    kind: 'text',
    label: 'Blood pressure after dialysis',
    pattern: 'bloodPressure',
    helperText: 'Systolic only or systolic/diastolic (e.g. 120/80)',
  },
  pulse: { kind: 'numeric', label: 'Pulse Rate After Dialysis', min: 0, max: 230, units: 'beats/min' },
  temperature: {
    kind: 'numeric',
    label: 'Temperature After Dialysis',
    min: 35,
    max: 43,
    units: '°C',
    helperText: 'Body temperature (35–43 °C)',
  },
  accessSite: { kind: 'numeric', label: 'Access Site', min: 0 },
  condition: { kind: 'text', label: 'Condition', pattern: 'freeText' },
  complications: { kind: 'text', label: 'Dialysis Complications', pattern: 'freeText' },
  fluidBalance: { kind: 'numeric', label: 'Fluid balance' },
  postDialysisKtV: { kind: 'numeric', label: 'Post-Dialysis Kt/V', min: 0, step: 0.01 },
  machineKtV: { kind: 'numeric', label: 'Machine Kt/V', min: 0, step: 0.01 },
  postHdNurseNotes: {
    kind: 'text',
    label: "Post-HD Nurse's Notes",
    pattern: 'freeText',
    helperText: 'Clinical notes after dialysis (separate from intra-dialytic monitoring data)',
  },
} as const satisfies Record<string, FieldDef>;

export const ADDITIONAL_MEDICATION_FIELDS = {
  name: { kind: 'text', label: 'Name of Medication', pattern: 'freeText' },
  dosage: { kind: 'text', label: 'Dosage', pattern: 'freeText' },
  administeredBy: { kind: 'text', label: 'Administered By', pattern: 'freeText' },
  adverseEvent: { kind: 'text', label: 'Adverse Event', pattern: 'freeText' },
} as const satisfies Record<string, FieldDef>;

export const SUMMARY_FIELDS = {
  prescribedDuration: { kind: 'numeric', label: 'Prescribed Duration', min: 0, max: 24, step: 0.5, units: 'hours' },
  actualDuration: { kind: 'numeric', label: 'Actual Duration', min: 0, max: 24, step: 0.5, units: 'hours' },
  adequacyAchieved: { kind: 'coded', label: 'Adequacy Achieved', rendering: 'radio' },
  toleratedProcedure: { kind: 'coded', label: 'Tolerated Procedure', rendering: 'radio' },
  comments: { kind: 'text', label: 'Comments', pattern: 'freeText' },
  additionalRemarks: { kind: 'text', label: 'Additional Remarks', pattern: 'freeText' },
} as const satisfies Record<string, FieldDef>;
