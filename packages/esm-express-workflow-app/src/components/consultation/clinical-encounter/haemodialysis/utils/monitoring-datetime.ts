import { toOmrsIsoString } from '@openmrs/esm-framework';

/** Parse OpenMRS / ISO datetime strings used for monitoring session start. */
export const parseMonitoringDatetime = (value?: string | null): Date | null => {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  // OpenMRS REST often returns +0300 without a colon.
  const withColonOffset = trimmed.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const retry = new Date(withColonOffset);
  if (!Number.isNaN(retry.getTime())) {
    return retry;
  }

  return null;
};

export const toMonitoringIsoString = (date: Date): string => {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid time value');
  }
  return toOmrsIsoString(date);
};

/** Datetime obs values use OpenMRS legacy format: yyyy-MM-dd HH:mm:ss (local time, no timezone). */
export const formatOpenMrsObsDatetimeValue = (date: Date): string => {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid time value');
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
};

export const parseToOpenMrsObsDatetimeValue = (value?: string): string | undefined => {
  if (!value?.trim()) {
    return undefined;
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return formatOpenMrsObsDatetimeValue(new Date(`${trimmed}T12:00:00`));
  }
  const parsed = parseMonitoringDatetime(trimmed) ?? new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }
  return formatOpenMrsObsDatetimeValue(parsed);
};

export const resolveMonitoringSessionStartIso = (monitoringStartedAt?: string, fallback: Date = new Date()): string => {
  const parsed = parseMonitoringDatetime(monitoringStartedAt);
  if (parsed) {
    return toMonitoringIsoString(parsed);
  }
  return toMonitoringIsoString(fallback);
};
