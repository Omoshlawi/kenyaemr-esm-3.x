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
  coverSelection?: {
    principalCrId: string;
    policyNumber: string;
  } | null;
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

export type BatchAttachmentResult = {
  index: number;
  intervention_code?: string;
  document_type?: string;
  success: boolean;
  already_sent?: boolean;
  attachment_uuid?: string;
  retrieval_id?: string;
  url?: string;
  mirror_failed?: boolean;
  mirror_error?: string;
  reason?: string;
  error?: string;
  upstream_error?: unknown;
};

export type BatchAttachmentsResponse = {
  success: boolean;
  consent_token: string;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: Array<BatchAttachmentResult>;
};

export type ClaimAttachmentItem = {
  uuid: string;
  document_type: string;
  document_title?: string | null;
  filename?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  url?: string | null;
  retrieval_id?: string | null;
  status?: string;
  date_created?: number | null;
};

export type ClaimAttachmentsByIntervention = {
  intervention_code: string;
  intervention_name?: string;
  status?: string;
  applicable_document_types: Array<string>;
  attachments: Array<ClaimAttachmentItem>;
};

export type ClaimAttachmentsResponse = {
  success: boolean;
  consent_token: string;
  total: number;
  interventions: Array<ClaimAttachmentsByIntervention>;
};

export type UploadAttachmentItem = {
  interventionCode: string;
  documentType: string;
  documentTitle?: string;
  file: File;
};

export type AddDoctorPayload = {
  identificationNumber: string;
  identificationType: string;
  regulationBody: string;
};

export type AddDoctorResponse = {
  success: boolean;
  doctor?: {
    claim?: string;
    doctor_name?: string;
    doctor_request_status?: string;
  };
  mirrored?: boolean;
  mirror_uuid?: string;
  mirror_error?: string;
  mirror_note?: string;
  upstream_error?: unknown;
  error?: string;
};

export type IdentificationTypeOption = {
  code: string;
  label: string;
};

export type IdentificationTypesResponse = {
  count: number;
  identification_types: Array<IdentificationTypeOption>;
};

export type ClaimDoctorItem = {
  uuid: string;
  doctor_name: string;
  date_created?: number | null;
};

export type ClaimDoctorsResponse = {
  success: boolean;
  consent_token: string;
  total: number;
  doctors: Array<ClaimDoctorItem>;
};
