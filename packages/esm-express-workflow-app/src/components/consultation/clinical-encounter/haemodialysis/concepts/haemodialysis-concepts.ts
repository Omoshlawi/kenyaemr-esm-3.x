import { defaultHaemodialysisConfig, type HaemodialysisConfig } from '../../../../../haemodialysis-config.defaults';

export const buildHaemodialysisAnswers = (config: HaemodialysisConfig = defaultHaemodialysisConfig) => ({
  ...config.answers,
});

export const buildVisitDiagnosisConcepts = (config: HaemodialysisConfig = defaultHaemodialysisConfig) => ({
  ...config.visitDiagnosis,
});

export const buildHaemodialysisConcepts = (config: HaemodialysisConfig = defaultHaemodialysisConfig) => {
  const { concepts } = config;

  return {
    biodata: {
      encounterDatetime: null as string | null,
      mainDiagnosis: null as string | null,
      ...concepts.biodata,
    },
    screening: { ...concepts.screening },
    preDialysis: {
      ...concepts.preDialysis,
      doctorNephrologist: concepts.summary.doctorName,
      accessSite: '',
    },
    prescription: {
      ...concepts.prescription,
      duration: concepts.summary.prescribedDuration,
    },
    machineChecks: { ...concepts.machineChecks },
    monitoring: { ...concepts.monitoring },
    connection: { ...concepts.connection },
    postDialysis: { ...concepts.postDialysis },
    nurseAssessment: { ...concepts.nurseAssessment },
    summary: { ...concepts.summary },
  };
};

export const buildHaemodialysisUiFieldConcepts = (config: HaemodialysisConfig = defaultHaemodialysisConfig) => {
  const concepts = buildHaemodialysisConcepts(config);

  return {
    diagnosis: concepts.biodata.mainDiagnosis,
    sessionDate: concepts.biodata.encounterDatetime,
    weightBefore: concepts.preDialysis.weightBefore,
    temperature: concepts.preDialysis.temperature,
    pulse: concepts.preDialysis.pulse,
    bloodPressure: concepts.preDialysis.bloodPressure,
    respiratoryRate: concepts.preDialysis.respiratoryRate,
    oxygenSaturation: concepts.preDialysis.oxygenSaturation,
    bloodSugar: concepts.preDialysis.bloodSugar,
    accessType: concepts.preDialysis.accessType,
    accessSite: concepts.postDialysis.accessSite,
    doctorNephrologist: concepts.summary.doctorName,
    dialyzerType: concepts.prescription.dialyzerType,
    bfr: concepts.prescription.bfr,
    dfr: concepts.prescription.dfr,
    duration: concepts.summary.prescribedDuration,
    ufGoal: concepts.prescription.ufGoal,
    heparinDose: concepts.prescription.heparinDose,
    dialysateComposition: concepts.prescription.dialysateComposition,
    monitoringBp: concepts.monitoring.bp,
    monitoringPulse: concepts.monitoring.pulse,
    monitoringTemp: concepts.monitoring.temp,
    ufRemoved: concepts.monitoring.ufRemoved,
    monitoringHeparin: concepts.monitoring.heparin,
    monitoringRemarks: concepts.monitoring.remarks,
    weightAfter: concepts.postDialysis.weightAfter,
    totalUfAchieved: concepts.postDialysis.totalUfAchieved,
    postBloodPressure: concepts.postDialysis.systolicBp,
    postPulse: concepts.postDialysis.pulse,
    postTemperature: concepts.postDialysis.temperature,
    condition: concepts.postDialysis.condition,
    complications: concepts.postDialysis.complications,
    prescribedDuration: concepts.summary.prescribedDuration,
    actualDuration: concepts.summary.actualDuration,
    adequacyAchieved: concepts.summary.adequacyAchieved,
    toleratedProcedure: concepts.summary.toleratedProcedure,
    comments: concepts.summary.comments,
    additionalRemarks: concepts.summary.additionalRemarks,
  };
};

export type HaemodialysisAnswersMap = typeof defaultHaemodialysisConfig.answers;
export type VisitDiagnosisConceptMap = typeof defaultHaemodialysisConfig.visitDiagnosis;
export type HaemodialysisConceptMap = ReturnType<typeof buildHaemodialysisConcepts>;
export type HaemodialysisConceptSection = keyof HaemodialysisConceptMap;

export const HAEMODIALYSIS_FORM_UUID = defaultHaemodialysisConfig.formUuid;
export const HAEMODIALYSIS_ENCOUNTER_TYPE_UUID = defaultHaemodialysisConfig.encounterTypeUuid;
export const HAEMODIALYSIS_ANSWERS = buildHaemodialysisAnswers();
export const VISIT_DIAGNOSIS_CONCEPTS = buildVisitDiagnosisConcepts();
export const HAEMODIALYSIS_CONCEPTS = buildHaemodialysisConcepts();
export const HAEMODIALYSIS_UI_FIELD_CONCEPTS = buildHaemodialysisUiFieldConcepts();
