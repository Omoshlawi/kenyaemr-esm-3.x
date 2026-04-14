export interface SHASubBenefit {
  code: string;
  name: string;
  fund: string;
  access_point: string;
  parent_benefit: string;
  parent_benefit_code: string;
  active: boolean;
}

export interface SHAIntervention {
  code: string;
  name: string;
  tariff: string;
  fund: string;
  access_point: string;
  needs_preauth: boolean;
  preauth_type: 'NONE' | 'NORMAL' | 'SURGICAL' | 'RENAL' | 'OPTICAL' | 'ONCOLOGY' | 'IMAGING';
  payment_mechanism: string;
  annual_quantity_limit: number | null;
  applicable_document_types: Array<string>;
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
  uuid: string;
  patient_uuid: string;
  patient_name: string;
  visit_uuid: string;
  authorization_code: string;
  workflow_state: string;
  claim_auth_status: string;
  service_type: string;
  visit_date: string;
  preauth_status: 'PENDING_PREAUTH' | 'PREAUTH_SUBMITTED' | 'AUTHORIZED';
  interventions: Array<{
    intervention_code: string;
    intervention_name: string;
    needs_preauth: boolean;
    preauth_exist: boolean;
    workflow_state: string;
    tariff: string;
    applicable_document_types: Array<string>;
  }>;
}
