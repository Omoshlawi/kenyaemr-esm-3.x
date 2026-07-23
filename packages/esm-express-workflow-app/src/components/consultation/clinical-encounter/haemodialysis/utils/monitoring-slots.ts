import { MONITORING_SLOT_INTERVAL_MINUTES, MONITORING_SLOT_LABELS_MINUTES } from '../constants/monitoring.constants';
import type { MonitoringRow } from '../types';

export type SlotStatus = 'completed' | 'skipped' | 'active' | 'upcoming';

export const FINAL_MONITORING_SLOT_MINUTE = MONITORING_SLOT_LABELS_MINUTES[MONITORING_SLOT_LABELS_MINUTES.length - 1];

export function getActiveSlotIndex(startedAt: Date, now: Date = new Date()): number {
  const elapsedMs = now.getTime() - startedAt.getTime();
  const intervalMs = MONITORING_SLOT_INTERVAL_MINUTES * 60 * 1000;
  const index = Math.floor(elapsedMs / intervalMs);
  return Math.min(Math.max(index, 0), MONITORING_SLOT_LABELS_MINUTES.length - 1);
}

export function getHighestFilledSlotIndex(rows: MonitoringRow[]): number {
  return MONITORING_SLOT_LABELS_MINUTES.reduce((highest, minute, index) => {
    return rows.some((row) => row.slotMinute === minute) ? index : highest;
  }, -1);
}

export function getTimeActiveSlotIndex(startedAt?: Date, now: Date = new Date()): number {
  if (!startedAt || Number.isNaN(startedAt.getTime())) {
    return 0;
  }
  return getActiveSlotIndex(startedAt, now);
}

/** Monitoring is complete once the final (240 min) slot is saved, or the 240 min window has elapsed. */
export function isMonitoringSessionExpired(startedAt?: Date, now: Date = new Date()): boolean {
  if (!startedAt || Number.isNaN(startedAt.getTime())) {
    return false;
  }
  const intervalMs = MONITORING_SLOT_INTERVAL_MINUTES * 60 * 1000;
  const lastSlotIndex = MONITORING_SLOT_LABELS_MINUTES.length - 1;
  const expireAfterMs = (lastSlotIndex + 1) * intervalMs;
  return now.getTime() - startedAt.getTime() >= expireAfterMs;
}

export function isMonitoringComplete(rows: MonitoringRow[], startedAt?: Date, now: Date = new Date()): boolean {
  return (
    rows.some((row) => row.slotMinute === FINAL_MONITORING_SLOT_MINUTE) || isMonitoringSessionExpired(startedAt, now)
  );
}

/**
 * A slot is skipped when it was never saved and its observation window has closed
 * (clock moved to the next slot), or a later slot was saved first (forward-only).
 */
export function isSlotSkipped(
  slotIndex: number,
  rows: MonitoringRow[],
  startedAt?: Date,
  now: Date = new Date(),
): boolean {
  const slotMinute = MONITORING_SLOT_LABELS_MINUTES[slotIndex];
  if (rows.some((row) => row.slotMinute === slotMinute)) {
    return false;
  }

  const highestFilled = getHighestFilledSlotIndex(rows);
  if (highestFilled > slotIndex) {
    return true;
  }

  if (!startedAt || Number.isNaN(startedAt.getTime())) {
    return false;
  }

  const timeActive = getTimeActiveSlotIndex(startedAt, now);
  const isLastSlot = slotIndex === MONITORING_SLOT_LABELS_MINUTES.length - 1;
  if (isLastSlot) {
    return isMonitoringSessionExpired(startedAt, now);
  }

  return timeActive > slotIndex;
}

/**
 * Next editable slot index, or -1 while waiting for the next slot window to unlock.
 * Never revisits skipped gaps once the clock or a later save has moved forward.
 */
export function getNextActiveSlotIndex(rows: MonitoringRow[], startedAt?: Date, now: Date = new Date()): number {
  if (isMonitoringComplete(rows, startedAt, now)) {
    return MONITORING_SLOT_LABELS_MINUTES.length;
  }

  const timeActive = getTimeActiveSlotIndex(startedAt, now);

  for (let i = 0; i < MONITORING_SLOT_LABELS_MINUTES.length; i++) {
    if (isSlotSkipped(i, rows, startedAt, now)) {
      continue;
    }

    const slotMinute = MONITORING_SLOT_LABELS_MINUTES[i];
    if (rows.some((row) => row.slotMinute === slotMinute)) {
      continue;
    }

    if (i <= timeActive) {
      return i;
    }

    return -1;
  }

  return MONITORING_SLOT_LABELS_MINUTES.length;
}

export function getProgressSlotStatus(
  slotIndex: number,
  rows: MonitoringRow[],
  startedAt?: Date,
  now: Date = new Date(),
): SlotStatus {
  const slotMinute = MONITORING_SLOT_LABELS_MINUTES[slotIndex];
  if (rows.some((row) => row.slotMinute === slotMinute)) {
    return 'completed';
  }

  if (isSlotSkipped(slotIndex, rows, startedAt, now)) {
    return 'skipped';
  }

  const activeIndex = getNextActiveSlotIndex(rows, startedAt, now);
  if (activeIndex >= 0 && slotIndex === activeIndex) {
    return 'active';
  }

  return 'upcoming';
}

export function isFinalMonitoringSlot(slotMinute: number): boolean {
  return slotMinute === FINAL_MONITORING_SLOT_MINUTE;
}

/** Clock time shown for a slot label (uses real 60-min steps from session start). */
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

export type MonitoringDisplayRow = MonitoringRow & { skipped?: boolean };

/** Table rows: saved observations plus past skipped slots only (no placeholders for upcoming). */
export function buildMonitoringDisplayRows(
  rows: MonitoringRow[],
  startedAt?: Date,
  now: Date = new Date(),
): MonitoringDisplayRow[] {
  const startDate = startedAt && !Number.isNaN(new Date(startedAt).getTime()) ? new Date(startedAt) : undefined;

  return MONITORING_SLOT_LABELS_MINUTES.flatMap((slotMinute, slotIndex) => {
    const saved = rows.find((row) => row.slotMinute === slotMinute);
    if (saved) {
      return [saved];
    }

    if (!isSlotSkipped(slotIndex, rows, startDate, now)) {
      return [];
    }

    const label = startDate
      ? `${formatSlotLabel(slotMinute)} (${formatSlotClockTime(startDate, slotMinute)})`
      : formatSlotLabel(slotMinute);

    return [
      {
        slotMinute,
        time: label,
        bp: '—',
        pulse: '—',
        temp: '—',
        ufRemoved: '—',
        heparin: '—',
        remarks: '—',
        skipped: true,
      },
    ];
  });
}
