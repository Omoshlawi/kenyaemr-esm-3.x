import { PreauthFormData, PreauthType } from '../pre-auth-workspace/pre-auth-schema';

export interface DiagnosisResult {
  uuid: string;
  display: string;
  icdCode: string | null;
}

export interface ConceptResult {
  uuid: string;
  display: string;
  mappings?: Array<{
    display: string;
    conceptMapType: { display: string };
  }>;
}

export interface ConceptResponse {
  results: Array<ConceptResult>;
}

export interface SubmitPreauthPayload {
  formData: PreauthFormData;
  preauthType: PreauthType;
  authorizationCode: string;
  interventionCode: string;
  tariff: string | number;
  isResubmit?: boolean;
}

export interface PreauthSubmitResult {
  success: boolean;
  authorizationCode?: string;
  message?: string;
  upstreamError?: string;
}

export interface ProviderResult {
  uuid: string;
  display: string;
  person: { display: string };
  licenseNumber: string | null;
  licenseBody: string | null;
  nationalId: string | null;
}

export interface ProviderAttribute {
  uuid: string;
  value: string | { display: string };
  attributeType: { uuid: string; display: string };
  voided: boolean;
}

export interface RawProvider {
  uuid: string;
  display: string;
  person: { display: string };
  attributes: Array<ProviderAttribute>;
}

export type InterventionItem = {
  id: string;
  code: string;
  text: string;
  disabled?: boolean;
  isElective: boolean;
};

export interface SurgicalFields {
  chief_complaint?: string;
  vital_signs?: string;
  history_of_present_illness?: string;
  physical_examination?: string;
  investigation_report_details?: string;
  type_of_anaesthesia?: string;
  surgery_date?: Date | string;
  surgery_date_time?: string;
  surgery_date_time_format?: 'AM' | 'PM';
}

export interface RenalFields {
  number_of_sessions_required?: string | number;
  cost_per_session?: string | number;
  frequency_of_sessions?: string;
  is_co_insured?: boolean;
  renal_date?: Date | string;
  renal_date_time?: string;
  renal_date_time_format?: 'AM' | 'PM';
}

export interface OncologyFields {
  carcinoma_staging?: string;
  comorbidity?: string;
  progress_report?: string;
  number_of_sessions?: string | number;
  metastases?: Array<string>;
  treatment_setting?: Array<string>;
}

export interface OpticalFields {
  necessity_of_service?: string;
  lens_prescription?: string;
  lens_amount?: string | number;
  eye_examination_amount?: string | number;
  frame_amount?: string | number;
  new_or_replacement?: string;
}

export interface ServiceTimeFields {
  service_start_time?: string;
  service_start_time_format?: 'AM' | 'PM';
  service_end_time?: string;
  service_end_time_format?: 'AM' | 'PM';
}

export type PreauthFormDataExtended = Partial<
  PreauthFormData & ServiceTimeFields & SurgicalFields & RenalFields & OncologyFields & OpticalFields
>;

export interface UpstreamErrorBody {
  error?: string;
  message?: string;
}

export interface SavannahErrorResponse {
  success?: boolean;
  error?: string;
  upstream_error?: UpstreamErrorBody;
  message?: string;
}
