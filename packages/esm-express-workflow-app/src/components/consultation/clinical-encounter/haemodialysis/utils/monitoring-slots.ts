import { MONITORING_SLOT_INTERVAL_MINUTES, MONITORING_SLOT_LABELS_MINUTES } from '../constants/monitoring.constants';
import type { MonitoringRow, MonitoringSessionAction } from '../types';
import { getFinalSlotMinute, isMonitoringTerminated } from './monitoring-schedule';
import { parseMonitoringDatetime } from './monitoring-datetime';

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

export function compareMonitoringRows(left: MonitoringRow, right: MonitoringRow): number {
  if (left.slotMinute !== right.slotMinute) {
    return left.slotMinute - right.slotMinute;
  }
  const leftTime = parseMonitoringDatetime(left.recordedAt)?.getTime() ?? 0;
  const rightTime = parseMonitoringDatetime(right.recordedAt)?.getTime() ?? 0;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return (left.time ?? '').localeCompare(right.time ?? '');
}

export function getRowsForSlot(rows: MonitoringRow[], slotMinute: number): MonitoringRow[] {
  return rows.filter((row) => row.slotMinute === slotMinute).sort(compareMonitoringRows);
}

export function getLatestRowForSlot(rows: MonitoringRow[], slotMinute: number): MonitoringRow | undefined {
  const matches = getRowsForSlot(rows, slotMinute);
  return matches[matches.length - 1];
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

export function isSlotWindowOpen(
  slotIndex: number,
  startedAt?: Date,
  now: Date = new Date(),
  runtime?: MonitoringSlotRuntime,
): boolean {
  if (isMonitoringTerminated(runtime?.monitoringAction) || isMonitoringSessionExpired(startedAt, now, runtime)) {
    return false;
  }
  return getTimeActiveSlotIndex(startedAt, now, runtime) === slotIndex;
}

export function isMonitoringComplete(
  _rows: MonitoringRow[],
  startedAt?: Date,
  now: Date = new Date(),
  runtime?: MonitoringSlotRuntime,
): boolean {
  if (isMonitoringTerminated(runtime?.monitoringAction)) {
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

  if (isSlotWindowOpen(slotIndex, startedAt, now, runtime)) {
    return false;
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

  return getTimeActiveSlotIndex(startedAt, now, runtime);
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

  if (isSlotWindowOpen(slotIndex, startedAt, now, runtime)) {
    return 'active';
  }

  if (rows.some((row) => row.slotMinute === slotMinute)) {
    return 'completed';
  }

  if (isSlotSkipped(slotIndex, rows, startedAt, now, runtime)) {
    return 'skipped';
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

export function formatClockTime(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatSlotLabel(slotLabelMinutes: number): string {
  return `${slotLabelMinutes} min`;
}

/** Chart labels matching the notes UI: Start (0:00), 60 min (1:00), … */
export function formatSlotChartLabel(slotMinute: number): string {
  const hours = Math.floor(slotMinute / 60);
  const mins = slotMinute % 60;
  const clock = `${hours}:${String(mins).padStart(2, '0')}`;
  if (slotMinute === 0) {
    return `Start (${clock})`;
  }
  return `${slotMinute} min (${clock})`;
}

export function formatObservationTime(row: MonitoringRow, startedAt?: Date): string {
  const recorded = parseMonitoringDatetime(row.recordedAt);
  if (recorded) {
    return `${formatSlotLabel(row.slotMinute)} (${formatClockTime(recorded)})`;
  }
  if (row.time?.trim()) {
    return row.time;
  }
  if (startedAt && !Number.isNaN(startedAt.getTime())) {
    return `${formatSlotLabel(row.slotMinute)} (${formatSlotClockTime(startedAt, row.slotMinute)})`;
  }
  return formatSlotLabel(row.slotMinute);
}

export function msUntilSlotUnlock(startedAt: Date, slotIndex: number, now: Date = new Date()): number {
  const unlockAt = startedAt.getTime() + slotIndex * MONITORING_SLOT_INTERVAL_MINUTES * 60 * 1000;
  return Math.max(0, unlockAt - now.getTime());
}

export type MonitoringDisplayRow = MonitoringRow & {
  skipped?: boolean;
  scheduled?: boolean;
  readingCount?: number;
  isActive?: boolean;
};

function buildMonitoringPlaceholderRow(
  slotMinute: number,
  flags: { skipped?: boolean; scheduled?: boolean; isActive?: boolean },
): MonitoringDisplayRow {
  return {
    slotMinute,
    time: formatSlotChartLabel(slotMinute),
    bp: '—',
    pulse: '—',
    temp: '—',
    ufRemoved: '—',
    heparin: '—',
    remarks: '—',
    skipped: flags.skipped,
    scheduled: flags.scheduled,
    isActive: flags.isActive,
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

  return slotLabels.map((slotMinute, slotIndex) => {
    const slotRows = getRowsForSlot(rows, slotMinute);
    const latest = slotRows[slotRows.length - 1];
    const status = getProgressSlotStatus(slotIndex, rows, startDate, now, runtime);
    const isActive = status === 'active';

    if (latest) {
      return {
        ...latest,
        time: formatSlotChartLabel(slotMinute),
        readingCount: slotRows.length,
        isActive,
      };
    }

    return buildMonitoringPlaceholderRow(slotMinute, {
      skipped: status === 'skipped',
      scheduled: status === 'upcoming' || isActive,
      isActive,
    });
  });
}

/** Highest slot minute with saved data, or undefined when none. */
export function getHighestFilledSlotMinute(rows: MonitoringRow[]): number | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  return Math.max(...rows.map((row) => row.slotMinute));
}
