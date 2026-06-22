import React, { useRef } from 'react';
import { Button, ButtonSet, ModalBody, ModalFooter, InlineLoading, InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { usePrescriptionPdf } from './print-prescription.resource';
import styles from './print-prescription.scss';

type PrintPrescriptionModalProps = {
  onClose: () => void;
  medicationRequestUuids: string[];
};

const PrintPrescriptionModal: React.FC<PrintPrescriptionModalProps> = ({ onClose, medicationRequestUuids }) => {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { pdfUrl, isLoading, error } = usePrescriptionPdf(medicationRequestUuids);

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  return (
    <>
      <ModalBody className={styles.modalBody}>
        {isLoading && (
          <div className={styles.stateContainer}>
            <InlineLoading description={t('loadingPrescription', 'Loading prescription...')} />
          </div>
        )}
        {error && !isLoading && (
          <div className={styles.stateContainer}>
            <InlineNotification
              kind="error"
              title={t('errorLoadingPrescription', 'Error loading prescription')}
              subtitle={error.message}
              hideCloseButton
            />
          </div>
        )}
        {pdfUrl && !isLoading && (
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            className={styles.pdfFrame}
            title={t('prescriptionPreview', 'Prescription Preview')}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <ButtonSet className={styles.btnSet}>
          <Button kind="secondary" onClick={onClose} type="button">
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" type="button" onClick={handlePrint} disabled={!pdfUrl || isLoading}>
            {t('print', 'Print')}
          </Button>
        </ButtonSet>
      </ModalFooter>
    </>
  );
};

export default PrintPrescriptionModal;
