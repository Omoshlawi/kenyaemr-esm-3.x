import React, { useEffect, useState } from 'react';
import { Button, Modal, RadioButton, RadioButtonGroup, TextArea, TextInput } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { MAX_MONITORING_EXTENSION_HOURS, getRemainingExtensionHours } from '../../utils/monitoring-schedule';
import type { MonitoringSessionAction } from '../../types';
import styles from './monitoring-actions.scss';

type ActionKind = 'terminate' | 'extend';

type Props = {
  monitoringStartedAt?: string;
  slotMinutes: number[];
  monitoringAction?: MonitoringSessionAction;
  monitoringComplete: boolean;
  canInteract: boolean;
  onTerminate: (reason: string) => Promise<boolean>;
  onExtend: (hours: number) => Promise<boolean>;
};

const MonitoringActions: React.FC<Props> = ({
  monitoringStartedAt,
  slotMinutes,
  monitoringAction,
  monitoringComplete,
  canInteract,
  onTerminate,
  onExtend,
}) => {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [actionKind, setActionKind] = useState<ActionKind | undefined>(undefined);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [hoursToAdd, setHoursToAdd] = useState('');
  const [hoursError, setHoursError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const remainingHours = getRemainingExtensionHours(slotMinutes);
  const canExtend = remainingHours > 0;

  useEffect(() => {
    if (!formOpen) {
      return;
    }
    setActionKind(undefined);
    setHoursToAdd('');
    setReason('');
    setReasonError('');
    setHoursError('');
  }, [formOpen, canExtend, remainingHours]);

  if (!monitoringStartedAt) {
    return null;
  }

  if (monitoringAction?.type === 'terminated') {
    return (
      <p className={styles.notice}>
        {t('haemodialysisMonitoringTerminatedNotice', 'Monitoring terminated at {{minute}} min.', {
          minute: monitoringAction.atSlotMinute,
        })}
        {monitoringAction.reason ? ` ${monitoringAction.reason}` : ''}
      </p>
    );
  }

  if (!canInteract) {
    return null;
  }

  if (monitoringComplete && !canExtend) {
    return null;
  }

  const maxHoursInput = Math.min(MAX_MONITORING_EXTENSION_HOURS, remainingHours);

  const closeForm = () => {
    setFormOpen(false);
  };

  const handleSubmit = async () => {
    if (!actionKind) {
      return;
    }

    if (actionKind === 'terminate') {
      if (!reason.trim()) {
        setReasonError(t('fieldRequired', 'This field is required'));
        return;
      }
      setReasonError('');
      setIsSaving(true);
      try {
        const ok = await onTerminate(reason);
        if (ok) {
          closeForm();
        }
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const trimmed = hoursToAdd.trim();
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > maxHoursInput) {
      setHoursError(
        t('haemodialysisExtendHoursInvalid', 'Enter a whole number of hours from 1 to {{max}}.', {
          max: maxHoursInput,
        }),
      );
      return;
    }
    setHoursError('');
    setIsSaving(true);
    try {
      const ok = await onExtend(parsed);
      if (ok) {
        closeForm();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.actions}>
      <Button kind="tertiary" size="sm" onClick={() => setFormOpen(true)}>
        {t('haemodialysisMonitoringAction', 'Action')}
      </Button>

      <Modal
        open={formOpen}
        modalHeading={t('haemodialysisMonitoringActionForm', 'Monitoring action')}
        primaryButtonText={isSaving ? t('saving', 'Saving...') : t('confirm', 'Confirm')}
        secondaryButtonText={t('cancel', 'Cancel')}
        primaryButtonDisabled={isSaving || !actionKind}
        onRequestClose={closeForm}
        onRequestSubmit={handleSubmit}>
        <p className={styles.formIntro}>
          {t(
            'haemodialysisMonitoringActionIntro',
            'Default monitoring covers 4 hours (0–240 min). Terminate early with a reason, or add hourly slots (up to {{max}} extension hours remaining).',
            { max: remainingHours },
          )}
        </p>

        <RadioButtonGroup
          legendText={t('haemodialysisMonitoringActionType', 'Action type')}
          name="monitoring-action-kind"
          valueSelected={actionKind}
          onChange={(value) => {
            setActionKind(value as ActionKind);
            setReasonError('');
            setHoursError('');
          }}>
          <RadioButton
            id="monitoring-action-terminate"
            labelText={t('haemodialysisTerminateMonitoring', 'Terminate monitoring')}
            value="terminate"
          />
          {canExtend ? (
            <RadioButton
              id="monitoring-action-extend"
              labelText={t('haemodialysisAddMonitoringHours', 'Add monitoring hours')}
              value="extend"
            />
          ) : null}
        </RadioButtonGroup>

        {actionKind === 'terminate' ? (
          <div className={styles.formField}>
            <TextArea
              id="monitoring-terminate-reason"
              labelText={t('haemodialysisTerminateReason', 'Reason for terminating monitoring')}
              value={reason}
              invalid={Boolean(reasonError)}
              invalidText={reasonError}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
            />
          </div>
        ) : null}

        {actionKind === 'extend' && canExtend ? (
          <div className={styles.formField}>
            <TextInput
              id="monitoring-extension-hours"
              type="number"
              labelText={t('haemodialysisHoursToAdd', 'Hours to add')}
              helperText={t(
                'haemodialysisHoursToAddHelper',
                'Type how many hours to add — each hour adds one table row (e.g. 2 → two rows at 300 and 360 min). Up to {{max}} remaining.',
                { max: maxHoursInput },
              )}
              min={1}
              max={maxHoursInput}
              step={1}
              invalid={Boolean(hoursError)}
              invalidText={hoursError}
              value={hoursToAdd}
              onChange={(event) => {
                setHoursError('');
                setHoursToAdd(event.target.value);
              }}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default MonitoringActions;
