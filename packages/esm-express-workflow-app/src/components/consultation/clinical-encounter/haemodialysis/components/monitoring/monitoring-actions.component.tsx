import React, { useEffect, useState } from 'react';
import { Button, Modal, RadioButton, RadioButtonGroup, TextArea, TextInput } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { MAX_MONITORING_EXTENSION_HOURS, getRemainingExtensionHours } from '../../utils/monitoring-schedule';
import type { MonitoringSessionAction } from '../../types';
import styles from './monitoring-actions.scss';

type ActionKind = 'continue' | 'emergency' | 'extend';

type Props = {
  slotMinutes: number[];
  monitoringAction?: MonitoringSessionAction;
  monitoringComplete: boolean;
  canInteract: boolean;
  onTerminate: (reason: string) => Promise<boolean>;
  onExtend: (hours: number) => Promise<boolean>;
};

const MonitoringActions: React.FC<Props> = ({
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
    setActionKind('continue');
    setHoursToAdd('');
    setReason('');
    setReasonError('');
    setHoursError('');
  }, [formOpen, canExtend, remainingHours]);

  const showActionButton =
    canInteract && monitoringAction?.type !== 'terminated' && !(monitoringComplete && remainingHours <= 0);

  const maxHoursInput = Math.min(MAX_MONITORING_EXTENSION_HOURS, remainingHours);

  const closeForm = () => {
    setFormOpen(false);
  };

  const handleSubmit = async () => {
    if (!actionKind || actionKind === 'continue') {
      closeForm();
      return;
    }

    if (actionKind === 'emergency') {
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
      {monitoringAction?.type === 'terminated' || monitoringAction?.type === 'sessionTerminated' ? (
        <div className={styles.banner}>
          <span className={styles.bannerIcon} aria-hidden="true">
            i
          </span>
          <p className={styles.bannerText}>
            {t(
              monitoringAction.type === 'sessionTerminated'
                ? 'haemodialysisSessionEmergencyRecorded'
                : 'haemodialysisEmergencyTerminatedNotice',
              monitoringAction.type === 'sessionTerminated'
                ? 'This dialysis session was stopped as an emergency.'
                : 'Emergency termination at {{minute}} min.',
              { minute: monitoringAction.atSlotMinute },
            )}{' '}
            <strong>
              {t('haemodialysisEmergencyTerminateReasonLabel', 'Reason')}: {monitoringAction.reason || '—'}
            </strong>
          </p>
        </div>
      ) : showActionButton ? (
        <Button kind="tertiary" size="sm" onClick={() => setFormOpen(true)}>
          {t('haemodialysisAction', 'Action')}
        </Button>
      ) : null}

      {showActionButton ? (
        <Modal
          open={formOpen}
          modalHeading={t('haemodialysisAction', 'Action')}
          primaryButtonText={isSaving ? t('saving', 'Saving...') : t('confirm', 'Confirm')}
          secondaryButtonText={t('cancel', 'Cancel')}
          primaryButtonDisabled={isSaving || !actionKind}
          onRequestClose={closeForm}
          onRequestSubmit={handleSubmit}>
          <p className={styles.formIntro}>
            {t(
              'haemodialysisMonitoringActionIntro',
              'Continue dialysis, add monitoring hours, or stop intra-dialytic monitoring with an emergency termination (reason required). This only ends monitoring and unlocks post-dialysis. Use Emergency termination at the bottom of the notes to stop the whole session.',
            )}
          </p>

          <RadioButtonGroup
            legendText={t('haemodialysisMonitoringActionType', 'Action')}
            name="monitoring-action-kind"
            valueSelected={actionKind}
            onChange={(value) => {
              setActionKind(value as ActionKind);
              setReasonError('');
              setHoursError('');
            }}>
            <RadioButton
              id="monitoring-action-continue"
              labelText={t('haemodialysisContinueDialysis', 'Continue dialysis')}
              value="continue"
            />
            <RadioButton
              id="monitoring-action-emergency"
              labelText={t('haemodialysisMonitoringEmergencyTermination', 'Emergency termination of monitoring')}
              value="emergency"
            />
            {canExtend ? (
              <RadioButton
                id="monitoring-action-extend"
                labelText={t('haemodialysisAddMonitoringHours', 'Add monitoring hours')}
                value="extend"
              />
            ) : null}
          </RadioButtonGroup>

          {actionKind === 'emergency' ? (
            <div className={styles.formField}>
              <TextArea
                id="monitoring-terminate-reason"
                labelText={t('haemodialysisMonitoringEmergencyReason', 'Reason for stopping intra-dialytic monitoring')}
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
      ) : null}
    </div>
  );
};

export default MonitoringActions;
