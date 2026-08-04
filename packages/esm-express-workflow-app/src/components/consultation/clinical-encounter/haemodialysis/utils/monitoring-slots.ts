import { MONITORING_SLOT_INTERVAL_MINUTES, MONITORING_SLOT_LABELS_MINUTES } from '../constants/monitoring.constants';
import type { MonitoringRow, MonitoringSessionAction } from '../types';
import { BASE_MONITORING_MAX_MINUTES, getFinalSlotMinute, isMonitoringTerminated } from './monitoring-schedule';

export type SlotStatus = 'completed' | 'skipped' | 'active' | 'upcoming';

export type MonitoringSlotRuntime = {
  slotLabelsMinutes?: readonly number[];
  monitoringAction?: MonitoringSessionAction;
};

function resolveSlotLabels(runtime?: MonitoringSlotRuntime): readonly number[] {
  return runtime?.slotLabelsMinutes?.length ? runtime.slotLabelsMinutes : MONITORING_SLOT_LABELS_MINUTES;
}

export function getFinalMonitoringSlotMinute(runtime?: MonitoringSlotRuntime): number {
  return getFinalSlotMinute([...resolveSlotLabels(runtime)]);
}

export function isFinalMonitoringSlot(slotMinute: number, runtime?: MonitoringSlotRuntime): boolean {
  return slotMinute === getFinalMonitoringSlotMinute(runtime);
}

export function getActiveSlotIndex(startedAt: Date, now: Date = new Date(), runtime?: MonitoringSlotRuntime): number {
  const slotLabels = resolveSlotLabels(runtime);
  const elapsedMs = now.getTime() - startedAt.getTime();
  const intervalMs = MONITORING_SLOT_INTERVAL_MINUTES * 60 * 1000;
  const index = Math.floor(elapsedMs / intervalMs);
  return Math.min(Math.max(index, 0), slotLabels.length - 1);
}

export function getHighestFilledSlotIndex(rows: MonitoringRow[], runtime?: MonitoringSlotRuntime): number {
  const slotLabels = resolveSlotLabels(runtime);
  return slotLabels.reduce((highest, minute, index) => {
    return rows.some((row) => row.slotMinute === minute) ? index : highest;
  }, -1);
}

export function getTimeActiveSlotIndex(
  startedAt?: Date,
  now: Date = new Date(),
  runtime?: MonitoringSlotRuntime,
): number {
  if (!startedAt || Number.isNaN(startedAt.getTime())) {
    return 0;
  }
  return getActiveSlotIndex(startedAt, now, runtime);
}

export function isMonitoringSessionExpired(
  startedAt?: Date,
  now: Date = new Date(),
  runtime?: MonitoringSlotRuntime,
): boolean {
  if (!startedAt || Number.isNaN(startedAt.getTime())) {
    return false;
  }
  const slotLabels = resolveSlotLabels(runtime);
  const intervalMs = MONITORING_SLOT_INTERVAL_MINUTES * 60 * 1000;
  const lastSlotIndex = slotLabels.length - 1;
  const expireAfterMs = (lastSlotIndex + 1) * intervalMs;
  return now.getTime() - startedAt.getTime() >= expireAfterMs;
}

export function isMonitoringComplete(
  rows: MonitoringRow[],
  startedAt?: Date,
  now: Date = new Date(),
  runtime?: MonitoringSlotRuntime,
): boolean {
  if (isMonitoringTerminated(runtime?.monitoringAction)) {
    return true;
  }

  const slotLabels = resolveSlotLabels(runtime);
  const finalMinute = slotLabels[slotLabels.length - 1];

  if (rows.some((row) => row.slotMinute === finalMinute)) {
    return true;
  }

  return isMonitoringSessionExpired(startedAt, now, runtime);
}

export function isSlotSkipped(
  slotIndex: number,
  rows: MonitoringRow[],
  startedAt?: Date,
  now: Date = new Date(),
  runtime?: MonitoringSlotRuntime,
): boolean {
  const slotLabels = resolveSlotLabels(runtime);
  const slotMinute = slotLabels[slotIndex];
  if (rows.some((row) => row.slotMinute === slotMinute)) {
    return false;
  }

  const highestFilled = getHighestFilledSlotIndex(rows, runtime);
  if (highestFilled > slotIndex) {
    return true;
  }

  if (!startedAt || Number.isNaN(startedAt.getTime())) {
    return false;
  }

  const timeActive = getTimeActiveSlotIndex(startedAt, now, runtime);
  const isLastSlot = slotIndex === slotLabels.length - 1;
  if (isLastSlot) {
    return isMonitoringSessionExpired(startedAt, now, runtime);
  }

  return timeActive > slotIndex;
}

export function getNextActiveSlotIndex(
  rows: MonitoringRow[],
  startedAt?: Date,
  now: Date = new Date(),
  runtime?: MonitoringSlotRuntime,
): number {
  const slotLabels = resolveSlotLabels(runtime);

  if (isMonitoringComplete(rows, startedAt, now, runtime)) {
    return slotLabels.length;
  }

  const timeActive = getTimeActiveSlotIndex(startedAt, now, runtime);

  for (let i = 0; i < slotLabels.length; i++) {
    if (isSlotSkipped(i, rows, startedAt, now, runtime)) {
      continue;
    }

    const slotMinute = slotLabels[i];
    if (rows.some((row) => row.slotMinute === slotMinute)) {
      continue;
    }

    if (i <= timeActive) {
      return i;
    }

    return -1;
  }

  return slotLabels.length;
}

export function getProgressSlotStatus(
  slotIndex: number,
  rows: MonitoringRow[],
  startedAt?: Date,
  now: Date = new Date(),
  runtime?: MonitoringSlotRuntime,
): SlotStatus {
  const slotLabels = resolveSlotLabels(runtime);
  const slotMinute = slotLabels[slotIndex];
  if (rows.some((row) => row.slotMinute === slotMinute)) {
    return 'completed';
  }

  if (isSlotSkipped(slotIndex, rows, startedAt, now, runtime)) {
    return 'skipped';
  }

  const activeIndex = getNextActiveSlotIndex(rows, startedAt, now, runtime);
  if (activeIndex >= 0 && slotIndex === activeIndex) {
    return 'active';
  }

  return 'upcoming';
}

export function formatSlotClockTime(startedAt: Date, slotLabelMinutes: number): string {
  if (Number.isNaN(startedAt.getTime())) {
    return '—';
  }
  const slotTime = new Date(startedAt.getTime() + slotLabelMinutes * 60 * 1000);
  if (Number.isNaN(slotTime.getTime())) {
    return '—';
  }
  return slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatSlotLabel(slotLabelMinutes: number): string {
  return `${slotLabelMinutes} min`;
}

export function msUntilSlotUnlock(startedAt: Date, slotIndex: number, now: Date = new Date()): number {
  const unlockAt = startedAt.getTime() + slotIndex * MONITORING_SLOT_INTERVAL_MINUTES * 60 * 1000;
  return Math.max(0, unlockAt - now.getTime());
}

export type MonitoringDisplayRow = MonitoringRow & { skipped?: boolean; scheduled?: boolean };

function buildMonitoringPlaceholderRow(
  slotMinute: number,
  startDate: Date | undefined,
  flags: { skipped?: boolean; scheduled?: boolean },
): MonitoringDisplayRow {
  const label = startDate
    ? `${formatSlotLabel(slotMinute)} (${formatSlotClockTime(startDate, slotMinute)})`
    : formatSlotLabel(slotMinute);

  return {
    slotMinute,
    time: label,
    bp: '—',
    pulse: '—',
    temp: '—',
    ufRemoved: '—',
    heparin: '—',
    remarks: '—',
    skipped: flags.skipped,
    scheduled: flags.scheduled,
  };
}

export function buildMonitoringDisplayRows(
  rows: MonitoringRow[],
  startedAt?: Date,
  now: Date = new Date(),
  runtime?: MonitoringSlotRuntime,
): MonitoringDisplayRow[] {
  const slotLabels = resolveSlotLabels(runtime);
  const startDate = startedAt && !Number.isNaN(new Date(startedAt).getTime()) ? new Date(startedAt) : undefined;

  return slotLabels.flatMap((slotMinute, slotIndex) => {
    const saved = rows.find((row) => row.slotMinute === slotMinute);
    if (saved) {
      return [saved];
    }

    const skipped = isSlotSkipped(slotIndex, rows, startDate, now, runtime);
    const isExtendedSlot = slotMinute > BASE_MONITORING_MAX_MINUTES;

    // Extended hourly slots always appear in the table (1 typed hour → 1 row).
    if (isExtendedSlot) {
      return [buildMonitoringPlaceholderRow(slotMinute, startDate, { skipped, scheduled: !skipped })];
    }

    if (!skipped) {
      return [];
    }

    return [buildMonitoringPlaceholderRow(slotMinute, startDate, { skipped: true })];
  });
}

/** Highest slot minute with saved data, or undefined when none. */
export function getHighestFilledSlotMinute(rows: MonitoringRow[]): number | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  return Math.max(...rows.map((row) => row.slotMinute));
}
