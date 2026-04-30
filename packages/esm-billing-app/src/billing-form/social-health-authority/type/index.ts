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
  preauth_type: 'NONE' | 'NORMAL' | 'SURGICAL' | 'RENAL' | 'OPTICAL' | 'ONCOLOGY' | 'IMAGING';
  applicable_document_types: string[];
  preauth_status:
    | 'FINALISED'
    | 'REJECTED'
    | 'REJECTED_AFTER_APPROVAL'
    | 'PENDING_SUBMISSION'
    | 'PENDING_DOCTOR_APPROVAL'
    | 'CANCELLED'
    | 'ACTIVE'
    | null;
  approved_amount: string | null;
  response_note: string | null;
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
