import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { ErrorState, getPatientName } from '@openmrs/esm-framework';
import { usePrintPreview } from './use-print-preview';
import styles from './visit-summary-print-preview.scss';

type VisitSummaryPrintPreviewModalProps = {
  onClose: () => void;
  visitUuid: string;
  patient: fhir.Patient;
};

const VisitSummaryPrintPreviewModal: React.FC<VisitSummaryPrintPreviewModalProps> = ({
  onClose,
  visitUuid,
  patient,
}) => {
  const { t } = useTranslation();
  const url = visitUuid ? `/openmrs/ws/rest/v1/kenyaemr/visitSummary/pdf?visitUuid=${visitUuid}` : null;
  const modalHeader = t('printPreview', 'Print Preview — Visit Summary {{patientName}}', {
    patientName: getPatientName(patient),
  });
  const { data, isLoading, error } = usePrintPreview(url);

  return (
    <div>
      <ModalHeader closeModal={onClose} className={styles.title}>
        {modalHeader}
      </ModalHeader>
      <ModalBody>
        {isLoading && (
          <div className={styles.loadingContainer}>
            <InlineLoading
              status="active"
              iconDescription="Loading"
              description={t('loadingSummary', 'Loading visit summary...')}
            />
          </div>
        )}
        {error && <ErrorState error={error} headerTitle={t('previewError', 'Preview Error')} />}
        {data && !isLoading && (
          <iframe
            src={data}
            title={t('visitSummaryPreview', 'Visit Summary Preview')}
            className={styles.previewFrame}
          />
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} type="button">
          {t('close', 'Close')}
        </Button>
        {data && (
          <Button
            kind="primary"
            type="button"
            onClick={() => {
              const iframe = document.querySelector<HTMLIFrameElement>(`.${styles.previewFrame}`);
              iframe?.contentWindow?.print();
            }}>
            {t('print', 'Print')}
          </Button>
        )}
      </ModalFooter>
    </div>
  );
};

export default VisitSummaryPrintPreviewModal;
