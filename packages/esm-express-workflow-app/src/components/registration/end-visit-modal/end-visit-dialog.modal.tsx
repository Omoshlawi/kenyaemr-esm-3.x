import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar, useVisit } from '@openmrs/esm-framework';
import { extractFetchError } from '../../../shared/utils';
import styles from './end-visit-dialog.scss';
import { processVisitInsuranceClaim } from './end-visit.resource';

interface EndVisitDialogProps {
  patientUuid: string;
  closeModal: () => void;
}

const EndVisitDialog: React.FC<EndVisitDialogProps> = ({ patientUuid, closeModal }) => {
  const { t } = useTranslation();
  const { activeVisit } = useVisit(patientUuid);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleEndVisit = () => {
    if (activeVisit) {
      setIsSubmitting(true);
      processVisitInsuranceClaim(activeVisit.uuid)
        .then((response) => {
          const responseMessage =
            typeof response?.data === 'string'
              ? response.data
              : response?.data?.message || JSON.stringify(response?.data);

          showSnackbar({
            isLowContrast: true,
            kind: 'success',
            subtitle: responseMessage,
            title: t('visitEnded', 'Visit ended'),
          });

          closeModal();
          setIsSubmitting(false);
        })
        .catch((error) => {
          showSnackbar({
            isLowContrast: true,
            kind: 'error',
            subtitle: extractFetchError(
              error,
              t('insuranceClaimProcessingFailed', 'Insurance claim processing failed'),
            ),
            title: t('claimProcessingError', 'Error'),
          });
          closeModal();
          setIsSubmitting(false);
        });
    }
  };

  return (
    <div>
      <ModalHeader
        closeModal={closeModal}
        title={t('endActiveVisitConfirmation', 'Are you sure you want to end this active visit?')}
      />
      <ModalBody>
        <p className={styles.bodyShort02}>
          {t('youCanAddAdditionalEncounters', 'You can add additional encounters to this visit in the visit summary.')}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleEndVisit} disabled={isSubmitting || !activeVisit}>
          {t('endVisit_title', 'End Visit')}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default EndVisitDialog;
