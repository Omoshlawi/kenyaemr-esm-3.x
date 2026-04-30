import { z } from 'zod';
import { addDays, toDateInputValue } from '../utils';

export const doctorSchema = z.object({
  display: z.string().optional(),
  identification_number: z.string().min(1, 'Doctor ID is required'),
  identification_type: z.string().min(1, 'ID type is required'),
  regulation_body: z.string().min(1, 'Regulation body is required'),
  is_primary: z.boolean().default(false),
  person: z
    .object({
      display: z.string().optional(),
    })
    .optional(),
});

export const diagnosisSchema = z.object({
  icd_code: z.string().min(1, 'ICD code is required'),
  display: z.string().optional(),
});

export const attachmentSchema = z.object({
  document_title: z.string().optional(),
  document_type: z.string().min(1, 'Document type is required'),
  file: z
    .instanceof(File)
    .nullable()
    .refine((f) => f !== null, 'File is required'),
});

export const basePreauthSchema = z.object({
  service_start: z.coerce.date().or(z.string().min(1, 'Service start date is required')),
  service_start_time: z.string().optional(),
  service_start_time_format: z.enum(['AM', 'PM']).default('AM'),
  service_end: z.coerce.date().or(z.string().min(1, 'Service end date is required')),
  service_end_time: z.string().optional(),
  service_end_time_format: z.enum(['AM', 'PM']).default('AM'),
  clinical_indications: z.string().optional(),
  provider_notification_email: z.string().min(1, 'Email is required').email('Invalid email'),
  doctors: z.array(doctorSchema).min(1, 'At least one doctor is required'),
  diagnoses: z.array(diagnosisSchema).min(1, 'At least one diagnosis is required'),
  attachments: z.array(attachmentSchema).min(1, 'At least one attachment is required'),
});

export const normalPreauthSchema = basePreauthSchema;

export const surgicalPreauthSchema = basePreauthSchema.extend({
  chief_complaint: z.string().optional(),
  vital_signs: z.string().optional(),
  history_of_present_illness: z.string().optional(),
  physical_examination: z.string().optional(),
  investigation_report_details: z.string().optional(),
  type_of_anaesthesia: z.enum(['GENERAL', 'LOCAL', 'REGIONAL', 'SPINAL', 'EPIDURAL']),
  surgery_date: z.string().optional(),
});

export const renalPreauthSchema = basePreauthSchema.extend({
  number_of_sessions_required: z
    .string()
    .min(1, 'Required')
    .refine((v) => Number(v) > 0, 'Must be > 0'),
  cost_per_session: z
    .string()
    .min(1, 'Required')
    .refine((v) => Number(v) > 0, 'Must be > 0'),
  frequency_of_sessions: z.enum(['ONCE_A_WEEK', 'TWICE_A_WEEK', 'ONCE_A_MONTH', 'DAILY']),
  start_date: z.string().optional(),
  is_co_insured: z.boolean().default(false),
});

export const oncologyPreauthSchema = basePreauthSchema.extend({
  carcinoma_staging: z.enum(['STAGE_1', 'STAGE_2', 'STAGE_3', 'STAGE_4']),
  comorbidity: z.string().optional(),
  metastases: z.array(z.string()).min(1, 'At least one metastasis site is required'),
  treatment_setting: z.array(z.string()).min(1, 'At least one treatment setting is required'),
  number_of_sessions_required: z
    .string()
    .min(1, 'Required')
    .refine((v) => Number(v) > 0, 'Must be > 0'),
  cost_per_session: z
    .string()
    .min(1, 'Required')
    .refine((v) => Number(v) > 0, 'Must be > 0'),
  is_co_insured: z.boolean().default(false),
});

export const opticalPreauthSchema = basePreauthSchema.extend({
  necessity_of_service: z.string().optional(),
  lens_prescription: z.enum(['FRAMES_LENSES', 'CONTACT_LENSES', 'LENSES_ONLY']),
  lens_amount: z.string().optional(),
  eye_examination_amount: z.string().optional(),
  frame_amount: z.string().optional(),
  new_or_replacement: z.enum(['NEW', 'REPLACEMENT']),
});

export type PreauthType = 'NORMAL' | 'SURGICAL' | 'RENAL' | 'ONCOLOGY' | 'IMAGING' | 'OPTICAL';
export type NormalPreauthFormData = z.infer<typeof normalPreauthSchema>;
export type SurgicalPreauthFormData = z.infer<typeof surgicalPreauthSchema>;
export type RenalPreauthFormData = z.infer<typeof renalPreauthSchema>;
export type OncologyPreauthFormData = z.infer<typeof oncologyPreauthSchema>;
export type OpticalPreauthFormData = z.infer<typeof opticalPreauthSchema>;
export type PreauthFormData =
  | NormalPreauthFormData
  | SurgicalPreauthFormData
  | RenalPreauthFormData
  | OncologyPreauthFormData
  | OpticalPreauthFormData;

export function getSchemaForType(preauthType: PreauthType) {
  switch (preauthType) {
    case 'SURGICAL':
      return surgicalPreauthSchema;
    case 'RENAL':
      return renalPreauthSchema;
    case 'ONCOLOGY':
      return oncologyPreauthSchema;
    case 'OPTICAL':
      return opticalPreauthSchema;
    default:
      return normalPreauthSchema;
  }
}

export function getDefaultValues(
  preauthType: PreauthType,
  isElective: boolean = false,
  existingItem?: { requested_on?: string; responded_on?: string },
): Partial<PreauthFormData> {
  const tomorrow = addDays(new Date(), 1);
  const dayAfter = addDays(new Date(), 2);

  const now = new Date();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeFormat = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const currentTime = `${String(hours12).padStart(2, '0')}:${minutes}`;

  const existingStart = existingItem?.requested_on
    ? toDateInputValue(new Date(existingItem.requested_on))
    : isElective
    ? toDateInputValue(tomorrow)
    : '';
  const existingEnd = existingItem?.responded_on
    ? toDateInputValue(new Date(existingItem.responded_on))
    : isElective
    ? toDateInputValue(dayAfter)
    : '';

  const baseDefaults = {
    service_start: existingStart,
    service_start_time: currentTime,
    service_start_time_format: timeFormat as 'AM' | 'PM',
    service_end: existingEnd,
    service_end_time: currentTime,
    service_end_time_format: timeFormat as 'AM' | 'PM',
    clinical_indications: '',
    provider_notification_email: '',
    doctors: [
      {
        identification_number: '',
        identification_type: 'registration_number',
        regulation_body: 'KMPDC',
        is_primary: true,
      },
    ],
    diagnoses: [{ icd_code: '', display: '' }],
    attachments: [{ document_title: '', document_type: 'LAB_ORDER', file: null }],
  };

  switch (preauthType) {
    case 'SURGICAL':
      return {
        ...baseDefaults,
        chief_complaint: '',
        vital_signs: '',
        history_of_present_illness: '',
        physical_examination: '',
        investigation_report_details: '',
        type_of_anaesthesia: 'GENERAL',
        surgery_date: isElective ? toDateInputValue(tomorrow) : '',
      };
    case 'RENAL':
      return {
        ...baseDefaults,
        number_of_sessions_required: '',
        cost_per_session: '',
        frequency_of_sessions: 'ONCE_A_WEEK',
        start_date: isElective ? toDateInputValue(tomorrow) : '',
        is_co_insured: false,
      };
    case 'ONCOLOGY':
      return {
        ...baseDefaults,
        carcinoma_staging: 'STAGE_1',
        comorbidity: '',
        metastases: [],
        treatment_setting: ['DAY_WARD'],
        number_of_sessions_required: '',
        cost_per_session: '',
        is_co_insured: false,
      };
    case 'OPTICAL':
      return {
        ...baseDefaults,
        necessity_of_service: '',
        lens_prescription: 'FRAMES_LENSES',
        lens_amount: '',
        eye_examination_amount: '',
        frame_amount: '',
        new_or_replacement: 'NEW',
      };
    default:
      return baseDefaults;
  }
}

export const electivePreAuthSchema = z.object({
  patientUuid: z.string().min(1, 'Please select a patient'),
  subBenefitCodes: z.array(z.string()).min(1, 'Please select at least one benefit package'),
  interventionCodes: z.array(z.string()).min(1, 'Please select at least one elective intervention'),
  serviceType: z.enum(['OUTPATIENT', 'INPATIENT']),
});

export type ElectivePreAuthFormData = z.infer<typeof electivePreAuthSchema>;
