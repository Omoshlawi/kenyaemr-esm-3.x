import React, { useEffect, useState } from 'react';
import { Button, Modal, TextArea } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import type { MonitoringSessionAction } from '../../types';
import styles from './session-emergency-termination.scss';

type Props = {
  canTerminate: boolean;
  monitoringAction?: MonitoringSessionAction;
  onTerminate: (reason: string) => Promise<boolean>;
};

const SessionEmergencyTermination: React.FC<Props> = ({ canTerminate, monitoringAction, onTerminate }) => {
  const { t } = useTranslation();
  const [formOpen, setFormOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const terminated = monitoringAction?.type === 'sessionTerminated';

  useEffect(() => {
    if (!formOpen) {
      return;
    }
    setReason('');
    setReasonError('');
  }, [formOpen]);

  const closeForm = () => {
    setFormOpen(false);
  };

  const handleSubmit = async () => {
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
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{t('haemodialysisEmergencyTermination', 'Emergency termination')}</h2>
      {terminated ? (
        <div className={styles.banner}>
          <span className={styles.bannerIcon} aria-hidden="true">
            i
          </span>
          <p className={styles.bannerText}>
            {t('haemodialysisSessionEmergencyRecorded', 'This dialysis session was stopped as an emergency.')}{' '}
            <strong>
              {t('haemodialysisEmergencyTerminateReasonLabel', 'Reason')}: {monitoringAction.reason || '—'}
            </strong>
          </p>
        </div>
      ) : (
        <>
          <p className={styles.intro}>
            {t(
              'haemodialysisSessionEmergencyIntro',
              'Stop this entire dialysis session at any stage, including post-dialysis and summary. A reason is required. After this, you can open a new dialysis session.',
            )}
          </p>
          {canTerminate ? (
            <Button kind="danger" size="sm" onClick={() => setFormOpen(true)}>
              {t('haemodialysisEmergencyTermination', 'Emergency termination')}
            </Button>
          ) : null}
        </>
      )}

      <Modal
        open={formOpen}
        danger
        modalHeading={t('haemodialysisEmergencyTermination', 'Emergency termination')}
        primaryButtonText={isSaving ? t('saving', 'Saving...') : t('submit', 'Submit')}
        secondaryButtonText={t('cancel', 'Cancel')}
        primaryButtonDisabled={isSaving}
        onRequestClose={closeForm}
        onRequestSubmit={handleSubmit}>
        <p className={styles.formIntro}>
          {t(
            'haemodialysisSessionEmergencyFormIntro',
            'Enter the reason, then submit to stop this entire dialysis session immediately. Remaining sections including post-dialysis and summary will be closed.',
          )}
        </p>
        <TextArea
          id="session-emergency-reason"
          labelText={t('haemodialysisEmergencyTerminateReason', 'Reason for emergency termination')}
          value={reason}
          invalid={Boolean(reasonError)}
          invalidText={reasonError}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
        />
      </Modal>
    </section>
  );
};

export default SessionEmergencyTermination;
