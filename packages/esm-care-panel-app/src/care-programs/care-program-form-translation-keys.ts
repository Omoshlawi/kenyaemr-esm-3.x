/**
 * This file exists solely to register care program form translation keys for i18next-parser extraction.
 * The keys are used dynamically via `formTranslationKey` in the careProgramForms config — the parser
 * cannot detect dynamic keys, so they are listed here as static t() calls.
 *
 * Do not remove or call this function at runtime.
 */
export function registerCareProgramFormTranslationKeys(t: (key: string, defaultValue: string) => string) {
  // VMMC
  t('vmmcEnrollment', 'VMMC Enrollment');
  t('vmmcInitial', 'VMMC Initial');
  t('vmmcClientFollowUp', 'VMMC Client Follow-Up');
  t('vmmcCircumcisionProcedure', 'VMMC Circumcision Procedure');
  t('vmmcImmediatePostOperationAssessment', 'VMMC Immediate Post-Operation Assessment');
  t('vmmcMedicalExamination', 'VMMC Medical Examination');
  t('vmmcDiscontinuation', 'VMMC Discontinuation');

  // CPM
  t('cpmEnrollment', 'CPM Enrollment');
  t('cpmInitial', 'CPM Initial');
  t('cpmReferral', 'CPM Referral');
  t('cpmScreening', 'CPM Screening');
  t('cpmDiscontinuation', 'CPM Discontinuation');

  // PNC
  t('pncEnrollment', 'PNC Enrollment');
  t('mchPncVisit', 'MCH PNC Visit');
  t('pncDiscontinuation', 'PNC Discontinuation');

  // ANC
  t('ancEnrollment', 'ANC Enrollment');
  t('mchAntenatalVisit', 'MCH Antenatal Visit');
  t('ancFollowUpForm', 'ANC Follow Up form');
  t('ancDiscontinuation', 'ANC Discontinuation');

  // MCH - Child Services (CWC)
  t('cwcEnrolment', 'CWC Enrolment');
  t('cwcInitial', 'Initial CWC');
  t('cwcFollowup', 'CWC Followup');
  t('cwcDiscontinuation', 'CWC Discontinuation');

  // Nutrition
  t('nutritionEnrollment', 'Nutrition Enrollment');
  t('nutritionForm', 'Nutrition form');
  t('nutritionDiscontinuation', 'Nutrition Discontinuation');

  // Family Planning
  t('familyPlanningEnrollment', 'Family Planning Enrollment');
  t('familyPlanningForm', 'Family Planning Form');
  t('familyPlanningDiscontinuation', 'Family Planning Discontinuation');

  // TB
  t('tbEnrollment', 'TB Enrollment');
  t('tbInitial', 'TB Initial');
  t('tbFollowUp', 'TB FollowUp');
  t('tbDiscontinuation', 'TB Discontinuation');

  // Violence screening
  t('violenceEnrollment', 'Violence enrollment');
  t('violenceScreening', 'Violence Screening');
  t('violenceInitialForm', 'Violence Initial Form');
  t('violenceConsentForm', 'Violence Consent Form');
  t('sexualViolencePostRapeCare363A', 'Sexual Violence post rape care 363A');
  t('sexualViolencePrcPsychologicalAssessment363B', 'Sexual Violence PRC Psychological Assessment 363B');
  t('physicalAndEmotionalViolenceForm', 'Physical and Emotional Violence Form');
  t('violenceTraumaCounselling', 'Violence Trauma Counselling');
  t('violenceReportingForm', 'Violence Reporting Form');
  t('violenceCommunityLinkageForm', 'Violence Community Linkage Form');
  t('violenceLegalForm', 'Violence Legal Form');
  t('violencePerpetratorDetails', 'Violence Perpetrator Details');
  t('pepFollowupForm', 'PEP FOLLOWUP Form');
  t('violenceDiscontinuationForm', 'Violence Discontinuation Form');

  // TPT
  t('tptInitiation', 'TPT Initiation');
  t('tptInitial', 'TPT Initial');
  t('tptFollowUp', 'TPT FollowUp');
  t('tptOutcomeDiscontinuation', 'TPT Outcome/Discontinuation');

  // PrEP
  t('prepEnrollment', 'PrEP Enrollment');
  t('prepInitiation', 'PrEP Initiation');
  t('prepClinicalForm', 'PrEP Clinical Form');
  t('prepDiscontinuation', 'PrEP Discontinuation');

  // NCD
  t('ncdEnrollment', 'NCD Enrollment');
  t('ncdInitial', 'NCD Initial');
  t('ncdFollowUp', 'NCD Follow Up');
  t('ncdDiscontinuation', 'NCD Discontinuation');

  // KVP
  t('kvpEnrollmentForm', 'KVP Enrollment Form');
  t('kvpContactForm', 'KVP Contact Form');
  t('kvpClinicalEnrollment', 'KVP Clinical Enrollment');
  t('kvpPeerEducatorOutreachCalendar', 'KVP Peer Educator Outreach Calendar');
  t('kvpClinicalEncounterForm', 'KVP Clinical Encounter form');
  t('kvpClientDiscontinuation', 'KVP Client Discontinuation');

  // HIV Program
  t('hivEnrollment', 'HIV Enrollment');
  t('hivInitialForm', 'HIV Initial form');
  t('artReadiness', 'ART Readyness');
  t('hivGreenCard', 'HIV Green Card');
  t('hivDiscontinuation', 'HIV Discontinuation');

  // Pre-Conception care program
  t('preConceptionCareEnrollmentForm', 'Pre-Conception Care Enrollment Form');
  t('preConceptionCare', 'Pre-Conception Care');
  t('preConceptionDiscontinuation', 'Pre-Conception Discontinuation');

  // MAT
  t('matClinicalEligibilityAssessmentAndReferralForm', 'MAT Clinical Eligibility Assessment & Referral Form');
  t('matInitialRegistrationForm', 'MAT Initial Registration Form');
  t('matPsychoSocialIntakeAndFollowUpForm', 'MAT Psycho-social Intake & Follow-up Form');
  t('matClinicalEncounterForm', 'MAT Clinical Encounter Form');
  t('matPsychiatricIntakeAndFollowUpForm', 'MAT Psychiatric Intake and Follow up Form');
  t('matTransitReferralForm', 'MAT Transit/Referral Form');
  t('matCessationForm', 'MAT Cessation Form');
  t('matDiscontinuationForm', 'MAT Discontinuation Form');
}
