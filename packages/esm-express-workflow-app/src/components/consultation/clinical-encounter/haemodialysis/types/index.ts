export type ScreeningStatus = {
  bloodGroup?: string;
  hivStatus?: string;
  /** YYYY-MM-DD (or ISO) of the latest HIV screening result. */
  hivTestDate?: string;
  hepatitisCStatus?: string;
  hepatitisCTestDate?: string;
  hepatitisBStatus?: string;
  hepatitisBTestDate?: string;
  syphilisStatus?: string;
  syphilisTestDate?: string;
  drugAllergy?: string;
};

export type PreDialysisAssessment = {
  weightBefore?: string;
  targetDryWeight?: string;
  interdialyticWeightGain?: string;
  height?: string;
  bodyMassIndex?: string;
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  respiratoryRate?: string;
  oxygenSaturation?: string;
  bloodSugar?: string;
  accessType?: string;
  additionalAssessment?: string;
  accessSite?: string;
  doctorNephrologist?: string;
};

export type PhysicianPrescription = {
  dialyzerType?: string;
  membraneType?: string;
  specifyOtherMembraneType?: string;
  fluxType?: string;
  dialyzerSize?: string;
  prescribedFrequencyPerWeek?: string;
  bfr?: string;
  dialysateComposition?: string | string[];
  acidConcentrateAmount?: string;
  sodiumBicarbonateConcentration?: string;
  potassiumBathConcentration?: string;
  dialysateCompositionOther?: string;
  otherDialysateAmount?: string;
  dfr?: string;
  duration?: string;
  ufGoal?: string;
  heparinDose?: string;
};

export type DialysisMachineCheck = {
  machineCheckDate?: string;
  bloodLeaks?: string;
  bloodLeakDateTime?: string;
  airDetector?: string;
  airDetectorDateTime?: string;
  dialysisFluidTemperature?: string;
  conductivity?: string;
  transmembranePressure?: string;
};

export type MonitoringRow = {
  uuid?: string;
  /** Slot label in minutes: 0, 60, 120, … up to 720 with extensions */
  slotMinute: number;
  /** Display label e.g. "0 min" or clock time */
  time: string;
  /** ISO datetime when this reading was recorded (multiple readings per slot). */
  recordedAt?: string;
  bp: string;
  pulse: string;
  temp: string;
  ufRemoved: string;
  heparin: string;
  remarks: string;
};

export type MonitoringSessionAction =
  | { type: 'none' }
  | { type: 'terminated'; atSlotMinute: number; reason: string; recordedAt?: string }
  | { type: 'sessionTerminated'; atSlotMinute: number; reason: string; recordedAt?: string }
  | { type: 'extended'; additionalHours: number; recordedAt?: string };

export type AdditionalMedicationRow = {
  uuid?: string;
  name?: string;
  dosage?: string;
  administeredBy?: string;
  adverseEvent?: string;
};

export type PostDialysisAssessment = {
  weightAfter?: string;
  totalUfAchieved?: string;
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  accessSite?: string;
  condition?: string;
  complications?: string;
  fluidBalance?: string;
  additionalMedications?: AdditionalMedicationRow[];
  postDialysisKtV?: string;
  machineKtV?: string;
  /** User-entered nurse notes (monitoring block stored separately on session). */
  postHdNurseNotes?: string;
};

export type DialysisSummary = {
  prescribedDuration?: string;
  actualDuration?: string;
  adequacyAchieved?: string;
  toleratedProcedure?: string;
  comments?: string;
  additionalRemarks?: string;
};

export type FacilityHeader = {
  hospitalName: string;
};

export type PatientBiodata = {
  name: string;
  shaNo?: string;
  age?: string;
  contact?: string;
  diagnosis?: string;
  opNo?: string;
  date?: string;
  sex?: string;
  clinic?: string;
  address?: string;
};

export type SignatureBlock = {
  nurseName?: string;
  nurseNckNo?: string;
  nurseDate?: string;
  doctorName?: string;
  doctorKmpdcNo?: string;
  doctorDate?: string;
};

export type HaemodialysisSession = {
  encounterUuid?: string;
  patientUuid: string;
  biodata: PatientBiodata;
  facility: FacilityHeader;
  /** Blood group, serology, and drug allergy captured before pre-dialysis assessment. */
  screening?: ScreeningStatus;
  preDialysis?: PreDialysisAssessment;
  prescription?: PhysicianPrescription;
  machineCheck?: DialysisMachineCheck;
  /** ISO datetime when the 0 min observation was recorded */
  monitoringStartedAt?: string;
  /** Effective hourly slot labels (minutes); defaults to 0–240 unless extended */
  monitoringSlotMinutes?: number[];
  monitoringAction?: MonitoringSessionAction;
  monitoring: MonitoringRow[];
  postDialysis?: PostDialysisAssessment;
  summary?: DialysisSummary;
  signatures?: SignatureBlock;
  /** Raw nurse notes obs used to persist monitoring until dedicated concepts exist */
  postHdNurseNotes?: string;
};

/** True when a haemodialysis encounter has been saved for this session */
export const hasInitialAssessment = (session?: HaemodialysisSession | null): boolean => Boolean(session?.encounterUuid);
