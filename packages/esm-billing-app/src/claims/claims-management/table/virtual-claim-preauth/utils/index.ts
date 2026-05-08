import { formatDatetime } from '@openmrs/esm-framework';
import type { FieldErrors, FieldValues, Path } from 'react-hook-form';
import { type SHAIntervention, type PreauthQueueItem } from '../../../../../billing-form/social-health-authority/type';
import { PreauthFormData } from '../pre-auth-workspace/pre-auth-schema';
import { ConceptResult, PreauthFormDataExtended, ProviderAttribute, SavannahErrorResponse } from '../type';
import { mutate } from 'swr';

export function formatShaDate(value: string | null | undefined): string {
  if (!value?.trim()) {
    return '—';
  }
  const iso = value.replace(/(\.\d{3})\d+/, '$1');
  let date = new Date(iso);
  if (isNaN(date.getTime())) {
    date = new Date(value.replace(/\bEAT\b/, '+0300'));
  }
  if (isNaN(date.getTime())) {
    return value;
  }
  return formatDatetime(date);
}

export function isWithinDateRange(dateStr: string | null | undefined, from: Date | null, to: Date | null): boolean {
  if (!from && !to) {
    return true;
  }
  if (!dateStr) {
    return false;
  }
  const iso = dateStr.replace(/(\.\d{3})\d+/, '$1').replace(/\bEAT\b/, '+0300');
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    return true;
  }
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (from && d < from) {
    return false;
  }
  if (to && d > to) {
    return false;
  }
  return true;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0];
}

export const isElectiveIntervention = (intervention: SHAIntervention): boolean => {
  const value = (intervention as SHAIntervention & { needs_manual_preauth_approval?: boolean })
    .needs_manual_preauth_approval;
  return Boolean(value);
};

export const getInterventionTariff = (intervention: SHAIntervention | undefined): number | undefined => {
  if (!intervention?.tariff) {
    return undefined;
  }
  const parsed = Number(intervention.tariff);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const formatSavannahDate = (date: Date | string, time?: string, format?: string): string => {
  if (!date) {
    return '';
  }
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (time && format) {
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10);
    if (format === 'PM' && h !== 12) {
      h += 12;
    }
    if (format === 'AM' && h === 12) {
      h = 0;
    }
    return `${base}T${pad(h)}:${mStr ?? '00'}:00+03:00`;
  }
  return `${base}T00:00:00+03:00`;
};

export function buildPreauthFormData(data: PreauthFormData, item: PreauthQueueItem, _isElective: boolean): FormData {
  const fd = new FormData();
  const d = data as PreauthFormDataExtended;

  fd.append('consent_token', item.authorization_code ?? '');
  fd.append('intervention_code', item.intervention_code ?? '');

  if (d.service_start) {
    fd.append('service_start', formatSavannahDate(d.service_start, d.service_start_time, d.service_start_time_format));
  }
  if (d.service_end) {
    fd.append('service_end', formatSavannahDate(d.service_end, d.service_end_time, d.service_end_time_format));
  }

  if (d.clinical_indications) {
    fd.append('clinical_indications', d.clinical_indications);
  }
  if (d.provider_notification_email) {
    fd.append('provider_notification_email', d.provider_notification_email);
  }

  if (d.chief_complaint) {
    fd.append('chief_complaint', d.chief_complaint);
  }
  if (d.vital_signs) {
    fd.append('vital_signs', d.vital_signs);
  }
  if (d.history_of_present_illness) {
    fd.append('history_of_present_illness', d.history_of_present_illness);
  }
  if (d.physical_examination) {
    fd.append('physical_examination', d.physical_examination);
  }
  if (d.investigation_report_details) {
    fd.append('investigation_report_details', d.investigation_report_details);
  }
  if (d.type_of_anaesthesia) {
    fd.append('type_of_anaesthesia', d.type_of_anaesthesia);
  }
  if (d.surgery_date) {
    fd.append('surgery_date', formatSavannahDate(d.surgery_date, d.surgery_date_time, d.surgery_date_time_format));
  }

  if (d.number_of_sessions_required != null) {
    fd.append('number_of_sessions_required', String(d.number_of_sessions_required));
  }
  if (d.cost_per_session != null) {
    fd.append('cost_per_session', String(d.cost_per_session));
  }
  if (d.frequency_of_sessions) {
    fd.append('frequency_of_sessions', d.frequency_of_sessions);
  }
  if (d.is_co_insured != null) {
    fd.append('is_co_insured', String(d.is_co_insured));
  }
  if (d.renal_date) {
    fd.append('start_date', formatSavannahDate(d.renal_date, d.renal_date_time, d.renal_date_time_format));
  }

  if (d.carcinoma_staging) {
    fd.append('carcinoma_staging', d.carcinoma_staging);
  }
  if (d.comorbidity) {
    fd.append('comorbidity', d.comorbidity);
  }
  if (d.progress_report) {
    fd.append('progress_report', d.progress_report);
  }
  if (d.number_of_sessions != null) {
    fd.append('number_of_sessions', String(d.number_of_sessions));
  }
  if (d.metastases?.length) {
    fd.append('metastases', JSON.stringify(d.metastases));
  }
  if (d.treatment_setting?.length) {
    fd.append('treatment_setting', JSON.stringify(d.treatment_setting));
  }

  if (d.necessity_of_service) {
    fd.append('necessity_of_service', d.necessity_of_service);
  }
  if (d.lens_prescription) {
    fd.append('lens_prescription', d.lens_prescription);
  }
  if (d.lens_amount != null) {
    fd.append('lens_amount', String(d.lens_amount));
  }
  if (d.eye_examination_amount != null) {
    fd.append('eye_examination_amount', String(d.eye_examination_amount));
  }
  if (d.frame_amount != null) {
    fd.append('frame_amount', String(d.frame_amount));
  }
  if (d.new_or_replacement) {
    fd.append('new_or_replacement', d.new_or_replacement);
  }

  const tariffAmount = item?.tariff ? String(item.tariff) : '0';
  fd.append('items', JSON.stringify([{ unit_price: tariffAmount }]));

  const doctors = (data.doctors ?? []).map((doc) => ({
    identification_number: doc.identification_number,
    identification_type: doc.identification_type ?? 'registration_number',
    regulation_body: doc.regulation_body ?? 'KMPDC',
    intervention_code: item.intervention_code ?? '',
    is_primary: doc.is_primary ?? false,
  }));
  if (doctors.length > 0) {
    fd.append('doctors', JSON.stringify(doctors));
  }

  const diagnoses = (data.diagnoses ?? [])
    .filter((diag) => diag.icd_code?.trim())
    .map((diag) => ({
      icd_code: diag.icd_code,
      consent_token: item.authorization_code ?? '',
      intervention_code: item.intervention_code ?? '',
    }));
  if (diagnoses.length > 0) {
    fd.append('diagnoses', JSON.stringify(diagnoses));
  }

  const attachmentsMeta: Array<{ document_title: string; document_type: string; file_field_name: string }> = [];
  (data.attachments ?? []).forEach((att, idx) => {
    if (!att.file) {
      return;
    }
    const fieldName = `attachments_${idx}_file_blob`;
    attachmentsMeta.push({
      document_title: att.document_title || att.file.name,
      document_type: att.document_type || 'LAB_TESTS',
      file_field_name: fieldName,
    });
    fd.append(fieldName, att.file, att.file.name);
  });
  if (attachmentsMeta.length > 0) {
    fd.append('attachments', JSON.stringify(attachmentsMeta));
  }

  return fd;
}

export const preauthField = <T extends FieldValues = PreauthFormData>(name: string): Path<T> => name as Path<T>;

export const getPreauthFieldError = (errors: FieldErrors<PreauthFormData>, name: string): string | undefined => {
  const errorRecord = errors as Record<string, { message?: string } | undefined>;
  return errorRecord[name]?.message;
};

export const asStringField = <
  T extends { value: unknown; onChange: (v: unknown) => void; onBlur: () => void; name: string; ref: unknown },
>(
  field: T,
): {
  value: string;
  onChange: T['onChange'];
  onBlur: T['onBlur'];
  name: T['name'];
  ref: T['ref'];
} => ({
  value: field.value == null ? '' : String(field.value),
  onChange: field.onChange,
  onBlur: field.onBlur,
  name: field.name,
  ref: field.ref,
});

export const extractIcdCode = (concept: ConceptResult): string | null => {
  if (!concept.mappings) {
    return null;
  }
  const match = concept.mappings.find(
    (m) => m.display?.startsWith('ICD-10-WHO:') || m.display?.startsWith('ICD-11:') || m.display?.startsWith('ICD-10:'),
  );
  return match ? match.display.split(': ')[1]?.trim() ?? null : null;
};

export const getProviderAttr = (attrs: Array<ProviderAttribute>, typeUuid: string): string | null => {
  const attr = attrs?.find((a) => !a.voided && a.attributeType?.uuid === typeUuid);
  if (!attr) {
    return null;
  }
  return typeof attr.value === 'object' ? attr.value?.display ?? null : attr.value;
};

export function extractUpstreamError(
  response: SavannahErrorResponse | string | unknown,
  fallback = 'An unexpected error occurred. Please try again.',
): string {
  if (!response) {
    return fallback;
  }

  if (typeof response === 'string') {
    return response || fallback;
  }

  const res = response as SavannahErrorResponse;

  const upstreamMsg = res.upstream_error?.message?.trim();
  if (upstreamMsg) {
    return upstreamMsg;
  }

  const upstreamErr = res.upstream_error?.error?.trim();
  if (upstreamErr && upstreamErr.toLowerCase() !== 'bad request') {
    return upstreamErr;
  }

  const topError = res.error?.trim();
  if (topError && !res.upstream_error) {
    return topError;
  }

  const topMsg = res.message?.trim();
  if (topMsg) {
    return topMsg;
  }

  if (topError) {
    return topError;
  }

  return fallback;
}

export function extractFetchError(err: unknown, fallback = 'An unexpected error occurred. Please try again.'): string {
  if (!err) {
    return fallback;
  }

  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;

    if (e.responseBody) {
      return extractUpstreamError(e.responseBody as SavannahErrorResponse, fallback);
    }

    if (e.data) {
      return extractUpstreamError(e.data as SavannahErrorResponse, fallback);
    }
  }

  if (err instanceof Error) {
    const msg = err.message;
    if (msg) {
      try {
        const parsed = JSON.parse(msg);
        return extractUpstreamError(parsed, msg);
      } catch {
        return msg;
      }
    }
    return fallback;
  }

  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    if ('upstream_error' in e || 'error' in e || 'message' in e) {
      return extractUpstreamError(e as SavannahErrorResponse, fallback);
    }
  }

  return fallback;
}

export const toDate = (value: unknown): Date | null => {
  if (value == null || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

export const handleQueueMutate = async (urlFragment: string) => {
  await mutate((key) => typeof key === 'string' && key.includes(urlFragment), undefined, { revalidate: true });
};
