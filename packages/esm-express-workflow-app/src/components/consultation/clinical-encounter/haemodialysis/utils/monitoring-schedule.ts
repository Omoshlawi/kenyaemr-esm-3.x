import { defaultHaemodialysisConfig } from '../../../../../haemodialysis-config.defaults';
import { MONITORING_SLOT_INTERVAL_MINUTES } from '../constants/monitoring.constants';
import type { MonitoringSessionAction } from '../types';

export const BASE_MONITORING_SLOT_MINUTES = defaultHaemodialysisConfig.monitoringSlotLabelsMinutes;
export const BASE_MONITORING_MAX_MINUTES = defaultHaemodialysisConfig.monitoringBaseMaxMinutes;
export const ABSOLUTE_MONITORING_MAX_MINUTES = defaultHaemodialysisConfig.monitoringAbsoluteMaxMinutes;
export const MAX_MONITORING_EXTENSION_HOURS = defaultHaemodialysisConfig.monitoringMaxExtensionHours;
export const MONITORING_EXTENSION_HOUR_OPTIONS = defaultHaemodialysisConfig.monitoringExtensionHourOptions;

export type MonitoringScheduleMeta = {
  slotMinutes: number[];
  action?: MonitoringSessionAction;
  extensionHoursTotal?: number;
};

export function buildDefaultSlotMinutes(): number[] {
  return [...BASE_MONITORING_SLOT_MINUTES];
}

export function getExtensionHoursFromSchedule(slotMinutes: number[]): number {
  const beyondBase = slotMinutes.filter((minute) => minute > BASE_MONITORING_MAX_MINUTES);
  if (beyondBase.length === 0) {
    return 0;
  }
  return beyondBase.length;
}

export function getRemainingExtensionHours(slotMinutes: number[]): number {
  const used = getExtensionHoursFromSchedule(slotMinutes);
  return Math.max(0, MAX_MONITORING_EXTENSION_HOURS - used);
}

export function appendExtensionHours(slotMinutes: number[], hoursToAdd: number): number[] {
  if (hoursToAdd <= 0) {
    return [...slotMinutes];
  }
  const remaining = getRemainingExtensionHours(slotMinutes);
  const appliedHours = Math.min(hoursToAdd, remaining);
  if (appliedHours === 0) {
    return [...slotMinutes];
  }

  const sorted = [...slotMinutes].sort((a, b) => a - b);
  let cursor = sorted[sorted.length - 1] ?? BASE_MONITORING_MAX_MINUTES;
  const next = [...sorted];

  for (let i = 0; i < appliedHours; i++) {
    cursor += 60;
    if (cursor > ABSOLUTE_MONITORING_MAX_MINUTES) {
      break;
    }
    next.push(cursor);
  }

  return [...new Set(next)].sort((a, b) => a - b);
}

export function resolveMonitoringSlotMinutes(meta?: MonitoringScheduleMeta): number[] {
  if (meta?.slotMinutes?.length) {
    return [...meta.slotMinutes].sort((a, b) => a - b);
  }
  return buildDefaultSlotMinutes();
}

export function getFinalSlotMinute(slotMinutes: number[]): number {
  return slotMinutes[slotMinutes.length - 1] ?? BASE_MONITORING_MAX_MINUTES;
}

export function isMonitoringTerminated(action?: MonitoringSessionAction): boolean {
  return action?.type === 'terminated' || action?.type === 'sessionTerminated';
}

/** Session-level abort: remaining capture including post-dialysis/summary is closed. */
export function isSessionAborted(action?: MonitoringSessionAction): boolean {
  return action?.type === 'sessionTerminated';
}

export function isTerminationAction(
  action?: MonitoringSessionAction,
): action is Extract<MonitoringSessionAction, { type: 'terminated' | 'sessionTerminated' }> {
  return action?.type === 'terminated' || action?.type === 'sessionTerminated';
}

/** True when the default 4-hour (240 min) slot window is active or past — uses slot unlock timing in demo/production, with wall-clock fallback. */
export function isBaseMonitoringWindowElapsed(startedAt: Date, now: Date = new Date()): boolean {
  if (Number.isNaN(startedAt.getTime())) {
    return false;
  }
  if (now.getTime() - startedAt.getTime() >= BASE_MONITORING_MAX_MINUTES * 60 * 1000) {
    return true;
  }
  const lastBaseIndex = BASE_MONITORING_SLOT_MINUTES.length - 1;
  const intervalMs = MONITORING_SLOT_INTERVAL_MINUTES * 60 * 1000;
  const timeActiveIndex = Math.min(
    Math.max(Math.floor((now.getTime() - startedAt.getTime()) / intervalMs), 0),
    lastBaseIndex,
  );
  return timeActiveIndex >= lastBaseIndex;
}

/** True while extension capacity remains (up to 8 h beyond the default 4 h schedule). */
export function canOfferMonitoringExtension(
  startedAt: Date | undefined,
  slotMinutes: number[],
  action?: MonitoringSessionAction,
): boolean {
  if (!startedAt || Number.isNaN(startedAt.getTime()) || isMonitoringTerminated(action)) {
    return false;
  }
  return getRemainingExtensionHours(slotMinutes) > 0;
}
