import React, { useEffect, useMemo, useState } from 'react';
import { Modal, TextInput } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { MONITORING_SLOT_LABELS_MINUTES } from '../constants/monitoring.constants';
import type { MonitoringRow } from '../types';
import { parseMonitoringDatetime, resolveMonitoringSessionStartIso } from '../utils/monitoring-datetime';
import {
  formatSlotClockTime,
  formatSlotLabel,
  getNextActiveSlotIndex,
  getProgressSlotStatus,
  isMonitoringComplete,
  type MonitoringSlotRuntime,
} from '../utils/monitoring-slots';
import styles from './intra-dialytic-monitoring.form.scss';

export type MonitoringSlotFormValues = {
  bp: string;
  pulse: string;
  temp: string;
  ufRemoved: string;
  heparin: string;
  remarks: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  monitoringStartedAt?: string;
  slotLabelsMinutes?: number[];
  monitoringRuntime?: MonitoringSlotRuntime;
  rows: MonitoringRow[];
  onSaveSlot: (row: MonitoringRow, sessionStartIso: string) => boolean | Promise<boolean>;
};

const emptySlot = (): MonitoringSlotFormValues => ({
  bp: '',
  pulse: '',
  temp: '',
  ufRemoved: '',
  heparin: '',
  remarks: '',
});

const formatLiveClock = (date: Date): string =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const IntraDialyticMonitoringForm: React.FC<Props> = ({
  open,
  onClose,
  monitoringStartedAt,
  slotLabelsMinutes,
  monitoringRuntime,
  rows,
  onSaveSlot,
}) => {
  const { t } = useTranslation();
  const slotLabels = useMemo(
    () => (slotLabelsMinutes?.length ? slotLabelsMinutes : MONITORING_SLOT_LABELS_MINUTES),
    [slotLabelsMinutes],
  );
  const slotLabelsKey = useMemo(() => slotLabels.join(','), [slotLabels]);
  const persistedRowsKey = useMemo(
    () =>
      rows
        .map((row) => [row.slotMinute, row.bp, row.pulse, row.temp, row.ufRemoved, row.heparin, row.remarks].join(':'))
        .join('|'),
    [rows],
  );
  const runtime: MonitoringSlotRuntime = useMemo(
    () => monitoringRuntime ?? { slotLabelsMinutes: slotLabels },
    [monitoringRuntime, slotLabels],
  );
  const [now, setNow] = useState(() => new Date());
  const [slotValues, setSlotValues] = useState<Record<number, MonitoringSlotFormValues>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sessionStarted = Boolean(monitoringStartedAt);

  const startedAt = useMemo(() => {
    const parsed = parseMonitoringDatetime(monitoringStartedAt);
    if (parsed) {
      return parsed;
    }
    return now;
  }, [monitoringStartedAt, now]);

  const activeIndex = getNextActiveSlotIndex(rows, startedAt, now, runtime);
  const allSlotsComplete = isMonitoringComplete(rows, startedAt, now, runtime);
  const waitingForNextSlot = sessionStarted && activeIndex < 0 && !allSlotsComplete;

  useEffect(() => {
    if (open && allSlotsComplete) {
      onClose();
    }
  }, [open, allSlotsComplete, onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const next: Record<number, MonitoringSlotFormValues> = {};
    slotLabels.forEach((slotMinute, index) => {
      const existing = rows.find((r) => r.slotMinute === slotMinute);
      if (existing) {
        next[index] = {
          bp: existing.bp,
          pulse: existing.pulse,
          temp: existing.temp,
          ufRemoved: existing.ufRemoved,
          heparin: existing.heparin,
          remarks: existing.remarks,
        };
      } else {
        next[index] = emptySlot();
      }
    });
    setSlotValues(next);
    setErrors({});
    setSaveError(null);
  }, [open, persistedRowsKey, monitoringStartedAt, slotLabelsKey]);

  const updateSlotField = (index: number, field: keyof MonitoringSlotFormValues, value: string) => {
    setSlotValues((prev) => ({
      ...prev,
      [index]: { ...(prev[index] ?? emptySlot()), [field]: value },
    }));
  };

  const handleSubmit = async () => {
    if (allSlotsComplete || activeIndex < 0) {
      return;
    }

    const slotMinute = slotLabels[activeIndex];
    const values = slotValues[activeIndex] ?? emptySlot();
    const nextErrors: Record<string, string> = {};

    if (!values.bp?.trim()) {
      nextErrors.bp = t('fieldRequired', 'This field is required');
    }
    if (!values.pulse?.trim()) {
      nextErrors.pulse = t('fieldRequired', 'This field is required');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaveError(null);

    let sessionStartIso: string;
    try {
      // First slot: capture real-time system clock at save. Later slots: reuse stored session start.
      sessionStartIso = resolveMonitoringSessionStartIso(monitoringStartedAt, new Date());
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('haemodialysisMonitoringSaveFailed', 'Save failed'));
      return;
    }

    const startDate = parseMonitoringDatetime(sessionStartIso) ?? new Date();
    const label = `${formatSlotLabel(slotMinute)} (${formatSlotClockTime(startDate, slotMinute)})`;

    setIsSaving(true);
    try {
      const saved = await onSaveSlot(
        {
          slotMinute,
          time: label,
          bp: values.bp,
          pulse: values.pulse,
          temp: values.temp,
          ufRemoved: values.ufRemoved,
          heparin: values.heparin,
          remarks: values.remarks,
        },
        sessionStartIso,
      );
      if (!saved) {
        setSaveError(t('haemodialysisMonitoringSaveFailed', 'Save failed. Check the notification for details.'));
        return;
      }
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('haemodialysisMonitoringSaveFailed', 'Save failed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      modalHeading={t('haemodialysisMonitoringFormTitle', 'Intra-Dialytic Monitoring')}
      primaryButtonText={isSaving ? t('saving', 'Saving...') : t('save', 'Save')}
      primaryButtonDisabled={isSaving || allSlotsComplete || activeIndex < 0}
      secondaryButtonText={t('cancel', 'Cancel')}
      onRequestClose={onClose}
      onRequestSubmit={handleSubmit}
      size="lg">
      <div className={styles.formBody}>
        {saveError ? <p className={styles.saveError}>{saveError}</p> : null}
        <p className={styles.sessionInfo}>
          {sessionStarted ? (
            <>
              {t('haemodialysisSessionStarted', 'Session started at')}{' '}
              <strong>{formatSlotClockTime(startedAt, 0)}</strong>
            </>
          ) : (
            <>
              {t('haemodialysisSessionStartNow', 'Session start (0 min) will be recorded at')}{' '}
              <strong>{formatLiveClock(now)}</strong>
              {' — '}
              {t('haemodialysisSessionStartNowHint', 'current system time when you save')}
            </>
          )}
        </p>
        {!sessionStarted ? (
          <p className={styles.hint}>
            {t(
              'haemodialysisSessionStartHint',
              'Complete each slot in order. The next slot unlocks immediately after you save the previous one.',
            )}
          </p>
        ) : null}
        {waitingForNextSlot ? (
          <p className={styles.hint}>
            {t(
              'haemodialysisSlotWaiting',
              'Waiting for the next observation window. Upcoming slots are not skipped until their time has passed.',
            )}
          </p>
        ) : null}

        {slotLabels.map((slotMinute, index) => {
          const status = getProgressSlotStatus(index, rows, startedAt, now, runtime);
          const values = slotValues[index] ?? emptySlot();
          const clock = formatSlotClockTime(startedAt, slotMinute);
          const readOnly = status !== 'active';

          return (
            <div
              key={slotMinute}
              className={`${styles.slot} ${styles[`slot${status.charAt(0).toUpperCase()}${status.slice(1)}`]}`}>
              <div className={styles.slotHeader}>
                <span className={styles.slotTitle}>
                  {formatSlotLabel(slotMinute)} — {clock}
                </span>
                <span className={styles.slotBadge}>
                  {status === 'completed'
                    ? t('haemodialysisSlotCompleted', 'Completed')
                    : status === 'skipped'
                    ? t('haemodialysisSlotSkipped', 'Skipped')
                    : status === 'active'
                    ? t('haemodialysisSlotActive', 'Active')
                    : t('haemodialysisSlotUpcoming', 'Upcoming')}
                </span>
              </div>
              <div className={styles.slotGrid}>
                <TextInput
                  id={`bp-${slotMinute}`}
                  labelText="BP"
                  value={values.bp}
                  readOnly={readOnly}
                  invalid={status === 'active' && Boolean(errors.bp)}
                  invalidText={errors.bp}
                  onChange={(e) => updateSlotField(index, 'bp', e.target.value)}
                />
                <TextInput
                  id={`pulse-${slotMinute}`}
                  labelText="Pulse"
                  value={values.pulse}
                  readOnly={readOnly}
                  invalid={status === 'active' && Boolean(errors.pulse)}
                  invalidText={errors.pulse}
                  onChange={(e) => updateSlotField(index, 'pulse', e.target.value)}
                />
                <TextInput
                  id={`temp-${slotMinute}`}
                  labelText="Temp"
                  value={values.temp}
                  readOnly={readOnly}
                  onChange={(e) => updateSlotField(index, 'temp', e.target.value)}
                />
                <TextInput
                  id={`uf-${slotMinute}`}
                  labelText="UF Removed"
                  value={values.ufRemoved}
                  readOnly={readOnly}
                  onChange={(e) => updateSlotField(index, 'ufRemoved', e.target.value)}
                />
                <TextInput
                  id={`heparin-${slotMinute}`}
                  labelText="Heparin"
                  value={values.heparin}
                  readOnly={readOnly}
                  onChange={(e) => updateSlotField(index, 'heparin', e.target.value)}
                />
                <TextInput
                  id={`remarks-${slotMinute}`}
                  labelText="Remarks"
                  value={values.remarks}
                  readOnly={readOnly}
                  onChange={(e) => updateSlotField(index, 'remarks', e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

export default IntraDialyticMonitoringForm;
