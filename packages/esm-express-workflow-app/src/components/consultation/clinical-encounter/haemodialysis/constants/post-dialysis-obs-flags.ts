/**
 * Controls which post-dialysis / summary observations are POSTed to OpenMRS.
 *
 * Concept UUIDs align with Haemodialysis Flow Chart (v1.2) — see haemodialysis-concepts.ts.
 * Disable a field if its concept is missing or the wrong datatype on your server.
 */
import { HAEMODIALYSIS_CONCEPTS } from '../concepts/haemodialysis-concepts';

export type PostDialysisObsFieldKey =
  | 'weightAfter'
  | 'totalUfAchieved'
  | 'bloodPressure'
  | 'pulse'
  | 'temperature'
  | 'accessSite'
  | 'condition'
  | 'complications'
  | 'fluidBalance'
  | 'additionalMedications'
  | 'postDialysisKtV'
  | 'machineKtV'
  | 'postHdNurseNotes'
  | 'prescribedDuration'
  | 'actualDuration'
  | 'adequacyAchieved'
  | 'toleratedProcedure'
  | 'comments'
  | 'additionalRemarks';

/** Set false only after verifying a concept fails on your OpenMRS server. */
export const POST_DIALYSIS_OBS_POST_ENABLED: Record<PostDialysisObsFieldKey, boolean> = {
  weightAfter: true, // 5089
  totalUfAchieved: true, // 162661
  bloodPressure: true, // 5085 / 5086
  pulse: true, // 163381
  temperature: true, // 8542c14f
  accessSite: true, // a34213be (numeric)
  condition: true, // 8828eed5 — text
  complications: true, // e6931b7a — text
  fluidBalance: true, // b8734463
  additionalMedications: true, // 165504 obs group
  postDialysisKtV: true, // 222f098f
  machineKtV: true, // 3978f969
  postHdNurseNotes: true, // 8035d3d1 — merged with monitoring block when present
  prescribedDuration: true, // 162603 — numeric
  actualDuration: true, // 63e3266b — numeric
  adequacyAchieved: true, // c42d8e95 — coded yes/no
  toleratedProcedure: true, // f45af7cf — coded yes/no
  comments: true, // 1111fedc — text
  additionalRemarks: true, // 160716 — text
};

/** Human-readable labels for REST error messages (concept UUID → field). */
export const POST_DIALYSIS_CONCEPT_LABELS: Record<string, string> = {
  [HAEMODIALYSIS_CONCEPTS.postDialysis.weightAfter]: 'Weight After',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.totalUfAchieved]: 'Total UF Achieved',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.systolicBp]: 'Systolic BP',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.diastolicBp]: 'Diastolic BP',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.pulse]: 'Pulse',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.temperature]: 'Temperature',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.accessSite]: 'Access Site',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.condition]: 'Condition',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.complications]: 'Complications',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.fluidBalance]: 'Fluid balance',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.postDialysisKtV]: 'Post-Dialysis Kt/V',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.machineKtV]: 'Machine Kt/V',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.medicationGroup]: 'Additional Medication',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.medicationName]: 'Medication Name',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.medicationDosage]: 'Medication Dosage',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.medicationAdministeredBy]: 'Administered By',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.medicationAdverseEvent]: 'Adverse Event',
  [HAEMODIALYSIS_CONCEPTS.summary.prescribedDuration]: 'Prescribed Duration',
  [HAEMODIALYSIS_CONCEPTS.summary.actualDuration]: 'Actual Duration',
  [HAEMODIALYSIS_CONCEPTS.summary.adequacyAchieved]: 'Adequacy Achieved',
  [HAEMODIALYSIS_CONCEPTS.summary.toleratedProcedure]: 'Tolerated Procedure',
  [HAEMODIALYSIS_CONCEPTS.summary.comments]: 'Comments',
  [HAEMODIALYSIS_CONCEPTS.summary.additionalRemarks]: 'Additional Remarks',
  [HAEMODIALYSIS_CONCEPTS.postDialysis.postHdNurseNotes]: 'Post-HD Nurse Notes',
};

export const getPostDialysisObsFieldLabel = (conceptUuid: string): string =>
  POST_DIALYSIS_CONCEPT_LABELS[conceptUuid] ?? conceptUuid;

export const isPostDialysisObsFieldEnabled = (field: PostDialysisObsFieldKey): boolean =>
  POST_DIALYSIS_OBS_POST_ENABLED[field] === true;

export const getDisabledPostDialysisObsFields = (): PostDialysisObsFieldKey[] =>
  (Object.entries(POST_DIALYSIS_OBS_POST_ENABLED) as Array<[PostDialysisObsFieldKey, boolean]>)
    .filter(([, enabled]) => !enabled)
    .map(([field]) => field);
