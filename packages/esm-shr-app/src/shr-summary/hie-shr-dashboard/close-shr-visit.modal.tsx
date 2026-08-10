import React, { useState } from 'react';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import styles from './hie-shr-dashboard.scss';

type CloseShrVisitModalProps = {
  onConfirm: () => Promise<void> | void;
  closeModal: () => void;
};

const CloseShrVisitModal: React.FC<CloseShrVisitModalProps> = ({ onConfirm, closeModal }) => {
  const { t } = useTranslation();
  const [isClosing, setIsClosing] = useState(false);

  const handleConfirm = async () => {
    setIsClosing(true);
    try {
      await onConfirm();
      closeModal();
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('closeShrVisit', 'Close SHR visit')} />
      <ModalBody>
        <p className={styles.helperText}>
          {t(
            'closeShrVisitConfirmation',
            'Closing this visit revokes the consent token and stops access to the shared health records. Reopening a visit requires a new patient consent and OTP.',
          )}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isClosing}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleConfirm} disabled={isClosing}>
          {isClosing ? <InlineLoading description={t('closing', 'Closing...')} /> : t('closeVisit', 'Close visit')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default CloseShrVisitModal;
