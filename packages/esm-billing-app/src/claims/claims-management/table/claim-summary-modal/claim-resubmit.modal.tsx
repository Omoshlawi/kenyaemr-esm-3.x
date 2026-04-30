import React, { useState } from 'react';
import { Button, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { openmrsFetch, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

type ClaimResubmitModalProps = {
  onClose: () => void;
  visitUuid?: string;
  billUuid?: string;
};

const ClaimResubmitModal: React.FC<ClaimResubmitModalProps> = ({ onClose, visitUuid }) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResubmit = async () => {
    if (!visitUuid) {
      return;
    }
    setIsSubmitting(true);
    try {
      const body: any = { visit_uuid: visitUuid };

      await openmrsFetch(`${restBaseUrl}/insuranceclaims/bill/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      showSnackbar({
        kind: 'success',
        title: t('resubmitClaim', 'Resubmit Claim'),
        subtitle: t('claimResubmitted', 'Claim resubmitted successfully'),
        timeoutInMs: 3000,
      });

      onClose();
    } catch (err: any) {
      showSnackbar({
        kind: 'error',
        title: t('resubmitClaimError', 'Resubmit Claim Error'),
        subtitle: err?.message ?? t('resubmitClaimFailed', 'Failed to resubmit claim'),
        timeoutInMs: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalHeader>{t('resubmitClaim', 'Resubmit Claim')}</ModalHeader>
      <ModalBody>
        <p>{t('resubmitClaimConfirm', 'Are you sure you want to resubmit this claim?')}</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} type="button">
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleResubmit} disabled={isSubmitting || !visitUuid} type="button">
          {isSubmitting ? t('resubmitting', 'Resubmitting...') : t('resubmit', 'Resubmit')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ClaimResubmitModal;
