import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, InlineNotification, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';

interface ResubmitConfirmModalProps {
  consentToken: string;
  closeModal: () => void;
  onConfirm: () => Promise<void> | void;
}

const ResubmitConfirmModal: React.FC<ResubmitConfirmModalProps> = ({ consentToken, closeModal, onConfirm }) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('resubmitConfirmTitle', 'Resubmit claim to SHA?')} />
      <ModalBody>
        <p>
          {t(
            'resubmitConfirmBody',
            'Claim {{code}} will be sent back to the payer for re-review with the changes you made.',
            { code: consentToken },
          )}
        </p>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--cds-text-secondary, #525252)' }}>
          {t(
            'resubmitConfirmNote',
            'The original consent token still authorizes this resubmission — no OTP or biometric verification is needed.',
          )}
        </p>
        {error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title={t('resubmitFailed', 'Resubmit failed')}
            subtitle={error}
            style={{ marginTop: '1rem' }}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isSubmitting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleConfirm} disabled={isSubmitting}>
          {isSubmitting ? (
            <InlineLoading description={t('resubmitting', 'Resubmitting...')} />
          ) : (
            t('resubmitToSha', 'Resubmit to SHA')
          )}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ResubmitConfirmModal;
