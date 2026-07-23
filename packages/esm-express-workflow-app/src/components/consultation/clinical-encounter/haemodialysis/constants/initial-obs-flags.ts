/**
 * Controls which initial-assessment observations are POSTed to OpenMRS.
 *
 * Only enable a field after its concept exists on the server with the expected datatype.
 * Custom UUID concepts (not legacy CIEL 32-char) caused repeated 400 ConversionException errors.
 *
 * Safe tier: standard CIEL vitals — enable first, confirm save works, then enable others one-by-one.
 */

export type InitialObsFieldKey =
  | 'weightBefore'
  | 'targetDryWeight'
  | 'interdialyticWeightGain'
  | 'height'
  | 'bodyMassIndex'
  | 'bloodPressure'
  | 'pulse'
  | 'temperature'
  | 'respiratoryRate'
  | 'oxygenSaturation'
  | 'bloodSugar'
  | 'accessType'
  | 'additionalAssessment'
  | 'accessSite'
  | 'doctorNephrologist'
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
  | 'duration'
  | 'ufGoal'
  | 'heparinDose';

/** Set true only after verifying concept + datatype on your OpenMRS server. */
export const INITIAL_OBS_POST_ENABLED: Record<InitialObsFieldKey, boolean> = {
  // --- Tier 1: standard CIEL vitals (start here) ---
  weightBefore: true,
  targetDryWeight: true, // 480ea417
  interdialyticWeightGain: true, // 8f372692
  height: true, // 163554
  bodyMassIndex: true, // 1342
  pulse: true,
  temperature: true,
  respiratoryRate: true,
  oxygenSaturation: true,

  // --- Tier 2: physician prescription (concepts imported on server) ---
  dialyzerType: true,
  membraneType: true, // fe901d83
  specifyOtherMembraneType: true, // 160632 — when membrane Others
  fluxType: true, // c1befdd0
  dialyzerSize: true, // c7c848bf
  prescribedFrequencyPerWeek: true, // fd9f82fd
  bfr: true,
  dialysateComposition: true,
  acidConcentrateAmount: true, // 9705f7da — when Acid Concentrate selected
  sodiumBicarbonateConcentration: true, // d6f9f221
  potassiumBathConcentration: true, // f7572a5a numeric (K+ bath selected)
  dialysateCompositionOther: true, // 160632 — when dialysate Others
  otherDialysateAmount: true, // d7f01f09
  dfr: true,
  duration: false, // 162603 is CIEL "Exposure duration" — not in Ampath form as session hours
  ufGoal: true,
  heparinDose: true,

  // --- Tier 3: pre-dialysis (concepts imported on server) ---
  bloodPressure: true, // 008bf719 pre-dialysis BP (text, e.g. 120/80)
  bloodSugar: true,
  accessType: true,
  additionalAssessment: true, // 4802a063
  accessSite: true,
  doctorNephrologist: true,
};

export const isInitialObsFieldEnabled = (field: InitialObsFieldKey): boolean =>
  INITIAL_OBS_POST_ENABLED[field] === true;

export const getDisabledInitialObsFields = (): InitialObsFieldKey[] =>
  (Object.entries(INITIAL_OBS_POST_ENABLED) as Array<[InitialObsFieldKey, boolean]>)
    .filter(([, enabled]) => !enabled)
    .map(([field]) => field);
