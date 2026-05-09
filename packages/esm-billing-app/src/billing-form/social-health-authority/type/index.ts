export interface SHASubBenefit {
  code: string;
  name: string;
  fund: string;
  access_point: string;
  parent_benefit: string;
  parent_benefit_code: string;
  active: boolean;
}

export type PreauthTypeName = 'NONE' | 'NORMAL' | 'SURGICAL' | 'RENAL' | 'OPTICAL' | 'ONCOLOGY' | 'IMAGING';

export type ApplicableDocumentType =
  | 'LAB_ORDER'
  | 'LAB_RESULTS'
  | 'LAB_TESTS'
  | 'FINAL_BILL'
  | 'INTERIM_BILL'
  | 'CLAIM_FORM'
  | 'PREAUTH_FORM'
  | 'DISCHARGE_SUMMARY'
  | 'REFERRAL_LETTER'
  | 'CLINICAL_DOCUMENTATION'
  | 'PRESCRIPTION'
  | 'THEATRE_LIST'
  | 'THEATRE_NOTES'
  | 'IMAGING_ORDER'
  | 'IMAGING_RESULT'
  | 'RADIOLOGY_REQUEST'
  | 'RADIOLOGICAL_EXAM'
  | 'PRIOR_BASIC_DIAGNOSTIC_IMAGES'
  | 'ULTRASOUND'
  | 'BIOPSY_RESULT'
  | 'HISTOPATHOLOGY_RESULTS'
  | 'STAGING_RESULTS'
  | 'TREATMENT_PLAN'
  | 'DIALYSIS_CHART'
  | 'CONSULTANT_REPORT'
  | 'MEDICAL_REPORT'
  | 'CASE_SUMMARY'
  | 'CASE_NOTES_JUSTIFYING_ADMISSION'
  | 'CRITICAL_CARE_UNIT_CASE_NOTES'
  | 'PROFORMA_INVOICE'
  | 'KMPDC_FORM'
  | 'LOU'
  | 'OTHER'
  | (string & {});

export interface SHAIntervention {
  code: string;
  name: string;
  tariff: string;
  fund: string;
  access_point: string;
  needs_preauth: boolean;
  preauth_type: PreauthTypeName;
  payment_mechanism: string;
  annual_quantity_limit: number | null;
  applicable_document_types: Array<ApplicableDocumentType>;
}

export interface VirtualClaimResponse {
  success: boolean;
  authorization_code?: string;
  claim?: Record<string, any>;
  error?: string;
}

export interface OTPResponse {
  success: boolean;
  otp?: string;
  otp_found?: boolean;
  raw_response?: { message: string };
  error?: string;
}

export interface PreauthQueueItem {
  claim_uuid: string;
  authorization_code: string;
  authorization_guid: string;
  service_type: string;
  workflow_state: string;
  claim_auth_status: string;
  date_created: string;
  patient: {
    uuid: string;
    display: string;
  };
  visit: {
    uuid: string;
    visitType: string;
    startDate: string;
  };
  intervention_code: string;
  intervention_name: string;
  tariff: string;
  payment_mechanism: string;
  preauth_exist: boolean;
  preauth_type: PreauthTypeName;
  applicable_document_types: Array<ApplicableDocumentType>;
  preauth_status:
    | 'FINALISED'
    | 'REJECTED'
    | 'REJECTED_AFTER_APPROVAL'
    | 'PENDING_SUBMISSION'
    | 'PENDING_DOCTOR_APPROVAL'
    | 'CANCELLED'
    | 'ACTIVE'
    | null;
  preauth_already_submitted: boolean;
  approved_amount: string | null;
  response_note: string | null;
  response_note_raw?: string | null;
  requested_on: string | null;
  responded_on: string | null;
  attachments: Array<{
    title: string | null;
    attachment_type: string | null;
    uploaded_file: string | null;
    content_type: string | null;
    intervention_code: string | null;
  }> | null;
}

export type ElectiveCheckinRecord = {
  authorization_code: string;
  workflow_state: string;
  is_approved: boolean;
  intervention_code: string | null;
  elective_intervention_code: string | null;
  intervention_name: string;
  tariff: string;
  patient_uuid: string | null;
  visit_uuid: string | null;
  elective_patient_cr_id: string | null;
  elective_scheduled_date: string | null;
  service_type: string | null;
  date_created: string | null;
};

export interface BiometricAuthorizeResponse {
  success: boolean;
  embed_url?: string;
  facility_name?: string;
  service_type?: string;
  authorization_code?: string;
  consent_token?: string;
  patient_uuid?: string;
  visit_uuid?: string;
  response?: any;
  error?: string;
  upstream_error?: any;
}

export interface BiometricAuthorizeRequest {
  agent_id: string;
  patient_id: string;
  interventions: string[];
  service_type: string;
  workstation_id: string;
  authorizing_device_os: string;
  is_emergency?: boolean;
  is_biometrics_discharge_authorization?: boolean;
  payment_mechanism?: string;
  factors?: string[];
  patient_uuid?: string;
  visit_uuid?: string;
}

export interface BiometricConfigResponse {
  agent_url: string;
  agent_timeout_ms: number;
  default_factors: string[];
}

export interface ProviderAttributesResponse {
  attributes: Array<{
    attributeType: { display: string; uuid: string };
    value: string;
  }>;
}

export type AuthorizingDeviceOS = 'windows' | 'android';
