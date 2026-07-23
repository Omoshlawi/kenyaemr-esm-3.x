/**
 * Controls optional encounter POST fields.
 *
 * `form` triggers OpenMRS form-schema validation against the full Ampath form.
 * While only a subset of obs are enabled, keep this false to avoid 400 errors.
 */
export const INCLUDE_FORM_IN_ENCOUNTER_POST = false;

/** Post ICD-11 diagnosis as Visit Diagnoses obs group (159947 construct). */
export const INCLUDE_ICD11_DIAGNOSIS_OBS = true;

/**
 * Top-level coded obs on encounter CREATE: OpenMRS REST accepts `{ uuid: "answer-uuid" }`.
 * POST /obs and encounter append normalize coded values to plain UUID strings before send.
 * Visit Diagnoses group members always use plain UUID strings (see buildVisitDiagnosisObsGroup).
 */
export const TOP_LEVEL_CODED_OBS_AS_OBJECT = true;
