export interface Root {
  success: boolean;
  patient_uuid: string;
  total_count: number;
  start_index: number;
  limit: number;
  claims: Array<{
    id: number;
    virtual_claim_uuid: string;
    upstream_claim_id: string;
    authorization_code: string;
    authorization_guid: string;
    beneficiary_cr_id: any;
    beneficiary_guid: any;
    member_number: string;
    beneficiary_fuzzy_matched: boolean;
    fund: any;
    payer_code: string;
    payer_name: string;
    payer_slade_code: any;
    scheme_code: string;
    scheme_name: string;
    currency: string;
    service_type: string;
    use_type: string;
    provider_workflow_state: string;
    provider_claim_auth_status: string;
    payer_workflow_state: any;
    payer_claim_status: any;
    is_resubmitted: boolean;
    is_negative: boolean;
    is_zero: boolean;
    reviewed_claim: boolean;
    charge_master_mapped: boolean;
    total_claim_amount: number;
    total_claim_copay: number;
    total_claim_discount: number;
    total_claim_net_amount: number;
    total_claim_splits: number;
    start_date: number;
    end_date: number;
    visit_start: any;
    visit_end: any;
    retry_count: number;
    guarantee_id: string;
    claim_justification: string;
    claim_explanation: string;
    notes: any;
    date_created: number;
    date_changed: number;
  }>;
  interventions: Array<{
    id: number;
    intervention_code: string;
    intervention_name: string;
    quantity: any;
    status: string;
    payment_mechanism: string;
    needs_preauth: boolean;
    preauth_exist: boolean;
    sub_benefit_code: string;
    supported_scheme: string;
    intervention_fund: string;
    switched_intervention: boolean;
    switched_from_code: any;
  }>;
  diagnoses: Array<{
    id: number;
    icd_code: string;
    icd_description: string;
    intervention_code: string;
    status: string;
    is_inpatient: boolean;
    is_flagged: boolean;
    is_resolved: boolean;
    source: string;
    upstream_guid?: string;
  }>;
  bill_lines: any[];
  preauths: any[];
}

export interface CloseReason {
  code: string;
  label: string;
  description: string;
}

export interface CashierLine {
  bill_line_item_id: number;
  bill_id: number;
  price: number;
  quantity: number;
  payment_status: 'PAID' | 'PENDING' | 'EXEMPTED' | string;
  voided: boolean;
  date_created: number;
  line_item_order: number;
  billable_service_name: string | null;
}

export interface PatientClaimIntervention {
  id: number;
  intervention_code: string;
  intervention_name: string;
  quantity: number | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
  payment_mechanism: string | null;
  keph_level_tariff: number | null;
  accrued_amount: number | null;
  accrued_days: number | null;
  needs_preauth: boolean;
  needs_manual_preauth_approval: boolean;
  preauth_exist: boolean;
  preauth_type: 'NORMAL' | 'RENAL' | 'SURGICAL' | 'ONCOLOGY' | 'OPTICAL' | 'IMAGING' | 'NONE' | string;
  requires_surgical_preauth: boolean;
  requires_renal_preauth: boolean;
  requires_oncology_preauth: boolean;
  requires_radiology_preauth: boolean;
  requires_optical_preauth: boolean;
  sub_benefit_code: string | null;
  supported_scheme: string | null;
  intervention_fund: string | null;
  active_for_uhc: boolean | null;
  applicable_document_types: Array<string>;
  last_synced_at: number | null;
  switched_intervention: boolean;
  switched_from_code: string | null;
  switched_lines_retained: boolean | null;
}

export interface PatientClaimDiagnosis {
  id: number;
  icd_code: string;
  icd_description: string;
  intervention_code: string | null;
  status: 'ATTACHED' | 'REJECTED' | 'PENDING_RETRY' | string;
  is_inpatient: boolean;
  is_flagged: boolean;
  is_resolved: boolean;
  source: string | null;
  upstream_guid: string | null;
}

export interface PatientClaimBillLine {
  id: number;
  intervention_code: string;
  openmrs_line_item_uuid: string | null;
  item_code: string | null;
  item_name: string | null;
  unit_price: number | null;
  quantity: number | null;
  unit: string | null;
  line_total_amount: number | null;
  line_net_amount: number | null;
  discount: number | null;
  charge_date: number | null;
  bill_from: number | null;
  bill_to: number | null;
  scheme_code: string | null;
  scheme_name: string | null;
  line_number: number | null;
  status: 'ACTIVE' | 'AUTO_GENERATED_PER_DIEM' | 'REMOVED' | 'CANCELLED' | string;
  uhc_exceeded: boolean | null;
  upstream_line_guid: string | null;
  upstream_invoice_guid: string | null;
  cashier_line: CashierLine | null;
}

export interface PatientClaimPreauth {
  id: number;
  uuid: string;
  intervention_code: string;
  upstream_preauth_guid: string | null;
  upstream_token: string | null;
  preauth_type: string | null;
  status: string | null;
  is_elective: boolean | null;
  is_emergency: boolean | null;
  doctor_approved: boolean | null;
  member_scheme: string | null;
  payer_invoice_no: string | null;
  response_note: string | null;
}

export interface PatientClaimAttachment {
  id?: number;
  title?: string | null;
  attachment_type?: string | null;
  uploaded_file?: string | null;
}

export interface PatientClaim {
  id: number;
  virtual_claim_uuid: string;
  upstream_claim_id: string | null;
  authorization_code: string;
  authorization_guid: string | null;
  beneficiary_cr_id: string | null;
  beneficiary_guid: string | null;
  member_number: string | null;
  beneficiary_fuzzy_matched: boolean | null;
  fund: string | null;
  payer_code: string | null;
  payer_name: string | null;
  payer_slade_code: string | null;
  scheme_code: string | null;
  scheme_name: string | null;
  currency: string | null;
  service_type: 'INPATIENT' | 'OUTPATIENT' | 'CAPITATION' | string;
  use_type: string | null;
  provider_workflow_state: string;
  provider_claim_auth_status: string | null;
  payer_workflow_state: string | null;
  payer_claim_status: string | null;
  is_resubmitted: boolean | null;
  is_negative: boolean | null;
  is_zero: boolean | null;
  reviewed_claim: boolean | null;
  charge_master_mapped: boolean | null;
  total_claim_amount: number | null;
  total_claim_net_amount: number | null;
  total_claim_copay: number | null;
  total_claim_discount: number | null;
  total_claim_splits: number | null;
  start_date: number | null;
  end_date: number | null;
  visit_start: number | null;
  visit_end: number | null;
  retry_count: number | null;
  guarantee_id: string | null;
  claim_justification: string | null;
  claim_explanation: string | null;
  notes: string | null;
  invoice_number: string | null;
  provider_last_synced_at: number | null;
  payer_last_synced_at: number | null;
  sync_status: 'OK' | 'ERROR' | string | null;
  sync_error_message: string | null;
  date_created: number;
  date_changed: number;
  interventions: Array<PatientClaimIntervention>;
  diagnoses: Array<PatientClaimDiagnosis>;
  bill_lines: Array<PatientClaimBillLine>;
  preauths: Array<PatientClaimPreauth>;
  attachments: Array<PatientClaimAttachment>;
  display_status: string;
  display_stage:
    | 'DRAFT'
    | 'DRAFT_RESUBMIT'
    | 'PREAUTH_PENDING'
    | 'PREAUTH_APPROVED'
    | 'PREAUTH_REJECTED'
    | 'PAYER_PENDING'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'CLOSED'
    | string;
}

export interface PatientClaimsResponse {
  success: boolean;
  patient_uuid: string;
  total_count: number;
  start_index: number;
  limit: number;
  claims: Array<PatientClaim>;
}

export type ClaimTabKey = 'pending' | 'sent' | 'resubmission' | 'closed' | 'paid';
