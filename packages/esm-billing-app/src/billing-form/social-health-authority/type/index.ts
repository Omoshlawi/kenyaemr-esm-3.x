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
  sub_benefit_code?: string | null;
  intervention_name: string;
  tariff: string;
  payment_mechanism: string;
  preauth_exist: boolean;
  preauth_type: PreauthTypeName;
  applicable_document_types: Array<ApplicableDocumentType>;
  required_preauth_document_types?: Array<ApplicableDocumentType>;
  optional_preauth_document_types?: Array<ApplicableDocumentType>;
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
  payment_mechanism: string | null;
};

export type BiometricAuthorizeResponse = {
  success: boolean;
  embed_url?: string;
  authorization_code?: string;
  consent_token?: string;
  token?: string;
  guid?: string;
  facility_name?: string;
  service_type?: string;
  response?: unknown;
  error?: string;
};
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

export type WhitelistReason = {
  code: string;
  label: string;
  description: string;
  review_type: 'AUTOMATIC' | 'MANUAL';
  requires_attachments: boolean;
};

export type WhitelistSubmitResponse = {
  success: boolean;
  request_id?: string;
  reason_type?: string;
  review_type?: 'AUTOMATIC' | 'MANUAL';
  upstream_status?: string;
  response?: any;
  error?: string;
  upstream_error?: any;
  already_whitelisted?: boolean;
  has_pending_request?: boolean;
};

export type WhitelistStatusPoll = {
  beneficiary_cr_id: string;
  is_whitelisted: boolean;
  has_pending: boolean;
  is_rejected: boolean;
  can_submit_new: boolean;
  latest_status: string | null;
  total: number;
  requests: Array<{
    request_id: string | null;
    status: string | null;
    reason_type: string | null;
    reason: string | null;
    biometric_attempts: string | null;
    beneficiary_name: string | null;
    facility_name: string | null;
    facility_fr_code: string | null;
    reviewed_by: string | null;
    reviewer_note: string | null;
    created_on: string | null;
    reviewed_on: string | null;
  }>;
};

export type BiometricAuthorizationStatus = {
  success: boolean;
  token: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  upstream_status: string | null;
  is_complete: boolean;
  is_approved: boolean;
  authorization_code: string | null;
  guid: string | null;
  beneficiary_name: string | null;
  beneficiary_cr_id: string | null;
  provider_name: string | null;
  provider_fid: string | null;
  expiry: string | null;
  date_authorized: string | null;
  is_open: boolean;
  needs_preauth: boolean;
  overall_preauth_finalised: boolean;
};

export type NonPomsfUtilizationFund = {
  fund_type: string;
  utilised_amount: string;
  max_amount: string;
  available_amount: string;
};

export type NonPomsfUtilizationResponse = {
  success: boolean;
  patient_id: string;
  intervention_code: string;
  eligibility: boolean;
  limit_scope: string;
  non_pomsf_utilization: Array<NonPomsfUtilizationFund>;
  message?: string;
};

export type BatchLineResult = {
  index: number;
  success: boolean;
  already_sent?: boolean;
  auto_generated?: boolean;
  mirror_failed?: boolean;
  mirror_error?: string;
  line_guid?: string;
  mirror_uuid?: string;
  intervention_code?: string;
  openmrs_line_item_uuid?: string;
  error?: string;
  reason?: string;
  upstream_error?: unknown;
};

export type BatchLinesResponse = {
  success: boolean;
  consent_token: string;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: Array<BatchLineResult>;
};

export interface PatientIdentifierResponse {
  results: Array<{
    uuid: string;
    identifier: string;
    identifierType: {
      uuid: string;
      required: boolean;
      name: string;
      resourceVersion: string;
    };
    preferred: boolean;
    resourceVersion: string;
  }>;
}

export type SupplementaryScheme = {
  schemeName?: string;
  schemeCode?: string;
  schemeId?: number;
  memberType?: string;
  policy?: {
    number?: string;
    startDate?: string;
    endDate?: string;
  };
  coverage?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    message?: string;
  };
  principalContributor?: {
    name?: string;
    idNumber?: string;
    idType?: string;
    crNumber?: string;
    relationship?: string;
    employmentType?: string;
    employerDetails?: {
      name?: string;
      jobGroup?: string;
    };
  };
};

export type SupplementaryEligibilityResponse = {
  success: boolean;
  count: number;
  member_cr_number?: string;
  full_name?: string;
  schemes?: Array<SupplementaryScheme>;
};

export type PomsfBalanceMatch = {
  scheme_code: string;
  scheme_name: string;
  policy_code: string;
  policy_name: string;
  policy_status: string;
  policy_active: boolean;
  policy_active_date: string;
  policy_end_date: string;
  benefit_code: string;
  benefit_name: string;
  benefit_type: string;
  benefit_limit: number;
  benefit_shared: string;
  benefit_balance?: Array<{ member?: string; balance?: number }>;
  sub_benefit_code: string;
  sub_benefit_name: string;
  sub_benefit_type: string;
  sub_benefit_limit: number;
  sub_benefit_shared: string;
  balance?: Array<{ member?: string; balance?: number }>;
};

export type PomsfBalancesResponse = {
  success: boolean;
  member?: {
    member_number?: string;
    principal_member_number?: string;
    national_id?: string;
    full_name?: string;
  };
  policy_year?: number;
  sub_benefit_code?: string;
  match_count?: number;
  matches?: Array<PomsfBalanceMatch>;
};

export interface LockCoverArgs {
  consentToken: string;
  principalCrId: string;
  policyNumber: string;
}

export interface LockCoverResult {
  ok: boolean;
  error?: string;
  upstream?: any;
}

export interface LockCoverBackendResponse {
  success?: boolean;
  upstream?: unknown;
  upstream_error?: { message?: string; [key: string]: unknown };
  error?: string;
}
