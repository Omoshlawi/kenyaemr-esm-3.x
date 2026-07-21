import { z } from 'zod';
import { addDays, toDateInputValue } from '../utils';

const dateOrString = z
  .union([z.date(), z.string().min(1, 'Date is required')])
  .transform((v) => (v instanceof Date ? toDateInputValue(v) : v));

const optionalDateOrString = z
  .union([z.date(), z.string(), z.undefined(), z.null()])
  .optional()
  .transform((v) => {
    if (!v) {
      return '';
    }
    return v instanceof Date ? toDateInputValue(v) : v;
  });

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
  // Client-side only: distinguishes documents generated in-app from manual uploads. Not sent to SHA.
  source: z.enum(['manual', 'generated']).optional(),
});

export const basePreauthSchema = z.object({
  service_start: dateOrString,
  service_start_time: z.string().optional(),
  service_start_time_format: z.enum(['AM', 'PM']).default('AM'),
  service_end: dateOrString,
  service_end_time: z.string().optional(),
  service_end_time_format: z.enum(['AM', 'PM']).default('AM'),
  clinical_indications: z.string().optional(),
  provider_notification_email: z.string().min(1, 'Email is required').email('Invalid email'),
  unit_price: z
    .string()
    .min(1, 'Unit price is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  doctors: z.array(doctorSchema).min(1, 'At least one doctor is required'),
  diagnoses: z.array(diagnosisSchema).min(1, 'At least one diagnosis is required'),
  attachments: z.array(attachmentSchema).min(0),
});

export const normalPreauthSchema = basePreauthSchema;

export const surgicalPreauthSchema = basePreauthSchema.extend({
  chief_complaint: z.string().optional(),
  vital_signs: z.string().optional(),
  history_of_present_illness: z.string().optional(),
  physical_examination: z.string().optional(),
  investigation_report_details: z.string().optional(),
  type_of_anaesthesia: z.enum(['GENERAL', 'LOCAL', 'REGIONAL', 'SPINAL', 'EPIDURAL']),
  surgery_date: optionalDateOrString,
  surgery_date_time: z.string().optional(),
  surgery_date_time_format: z.enum(['AM', 'PM']).default('AM'),
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
  renal_date: optionalDateOrString,
  renal_date_time: z.string().optional(),
  renal_date_time_format: z.enum(['AM', 'PM']).default('AM'),
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

export const imagingPreauthSchema = basePreauthSchema.extend({
  clinical_indications: z.string().min(10, 'Clinical indications are required for imaging preauth (min 10 characters)'),
});

export type PreauthType = 'NORMAL' | 'SURGICAL' | 'RENAL' | 'ONCOLOGY' | 'IMAGING' | 'OPTICAL';
export type NormalPreauthFormData = z.infer<typeof normalPreauthSchema>;
export type SurgicalPreauthFormData = z.infer<typeof surgicalPreauthSchema>;
export type RenalPreauthFormData = z.infer<typeof renalPreauthSchema>;
export type OncologyPreauthFormData = z.infer<typeof oncologyPreauthSchema>;
export type OpticalPreauthFormData = z.infer<typeof opticalPreauthSchema>;
export type ImagingPreauthFormData = z.infer<typeof imagingPreauthSchema>;
export type PreauthFormData =
  | NormalPreauthFormData
  | SurgicalPreauthFormData
  | RenalPreauthFormData
  | OncologyPreauthFormData
  | OpticalPreauthFormData
  | ImagingPreauthFormData;

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
    case 'IMAGING':
      return imagingPreauthSchema;
    default:
      return normalPreauthSchema;
  }
}

export function getDefaultValues(
  preauthType: PreauthType,
  isElective: boolean = false,
  existingItem?: { requested_on?: string; responded_on?: string },
  defaultUnitPrice?: string,
): Partial<PreauthFormData> {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);

  const hours = today.getHours();
  const minutes = String(today.getMinutes()).padStart(2, '0');
  const timeFormat = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const currentTime = `${String(hours12).padStart(2, '0')}:${minutes}`;

  const startDate = existingItem?.requested_on
    ? toDateInputValue(new Date(existingItem.requested_on))
    : isElective
    ? toDateInputValue(tomorrow)
    : toDateInputValue(today);

  const endDate = existingItem?.responded_on
    ? toDateInputValue(new Date(existingItem.responded_on))
    : isElective
    ? toDateInputValue(dayAfter)
    : toDateInputValue(tomorrow);

  const baseDefaults = {
    service_start: startDate,
    service_start_time: currentTime,
    service_start_time_format: timeFormat as 'AM' | 'PM',
    service_end: endDate,
    service_end_time: currentTime,
    service_end_time_format: timeFormat as 'AM' | 'PM',
    clinical_indications: '',
    provider_notification_email: '',
    unit_price: defaultUnitPrice ?? '',
    doctors: [
      {
        identification_number: '',
        identification_type: 'registration_number',
        regulation_body: 'KMPDC',
        is_primary: true,
      },
    ],
    diagnoses: [{ icd_code: '', display: '' }],
    attachments: [],
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
        surgery_date: isElective ? toDateInputValue(tomorrow) : toDateInputValue(today),
        surgery_date_time: currentTime,
        surgery_date_time_format: timeFormat as 'AM' | 'PM',
      };
    case 'RENAL':
      return {
        ...baseDefaults,
        number_of_sessions_required: '',
        cost_per_session: '',
        frequency_of_sessions: 'ONCE_A_WEEK',
        renal_date: isElective ? toDateInputValue(tomorrow) : toDateInputValue(today),
        renal_date_time: currentTime,
        renal_date_time_format: timeFormat as 'AM' | 'PM',
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
    case 'IMAGING':
      return {
        ...baseDefaults,
        clinical_indications: '',
      };
    default:
      return baseDefaults;
  }
}

export const electivePreAuthSchema = z.object({
  patientUuid: z.string().min(1, 'Select a patient'),
  subBenefitCode: z.string().min(1, 'Select a benefit package').nullable(),
  interventionCode: z.string().min(1, 'Select an intervention').nullable(),
  serviceType: z.enum(['OUTPATIENT', 'INPATIENT']),
});

export type ElectivePreAuthFormData = z.infer<typeof electivePreAuthSchema>;
