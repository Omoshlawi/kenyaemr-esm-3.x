export interface ClaimVisitResponse {
  success: boolean;
  authorization_code: string;
  workflow_state: string;
  virtual_claim_uuid: string;
  scheme_code: string;
  service_type: string;
  interventions: Array<{
    intervention_code: string;
    intervention_name: string;
    payment_mechanism: string;
    sub_benefit_code: string;
    intervention_fund: string;
    supported_scheme: string;
    needs_preauth: boolean;
    preauth_exist: boolean;
    status: string;
  }>;
}

export type PackageItem = {
  code: string;
  name: string;
  label: string;
};

export type InterventionItem = {
  id: string;
  code: string;
  name: string;
  text: string;
  disabled: boolean;
  isElective: boolean;
};
