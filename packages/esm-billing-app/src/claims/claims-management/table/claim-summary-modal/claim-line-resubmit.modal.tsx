import React, { useState } from 'react';
import { Button, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { resubmitInsuranceClaimLine } from './claim.resource';

type ClaimLineResubmitModalProps = {
  onClose: () => void;
  visit_uuid?: string;
  billUuid?: string;
};

const ClaimLineResubmitModal: React.FC<ClaimLineResubmitModalProps> = ({ onClose, visit_uuid }) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResubmit = async () => {
    if (!visit_uuid) {
      return;
    }
    setIsSubmitting(true);
    try {
      await resubmitInsuranceClaimLine(visit_uuid);

      showSnackbar({
        kind: 'success',
        title: t('resubmitClaimLine', 'Resubmit Claim Line'),
        subtitle: t('claimLineResubmitted', 'Claim line resubmitted successfully'),
        timeoutInMs: 3000,
      });

      onClose();
    } catch (err: any) {
      showSnackbar({
        kind: 'error',
        title: t('resubmitClaimLineError', 'Resubmit Claim Line Error'),
        subtitle: err?.message ?? t('resubmitClaimLineFailed', 'Failed to resubmit claim line'),
        timeoutInMs: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalHeader>{t('resubmitClaimLine', 'Resubmit Claim Line')}</ModalHeader>
      <ModalBody>
        <p>{t('resubmitClaimLineConfirm', 'Are you sure you want to resubmit this claim line?')}</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} type="button">
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={handleResubmit} disabled={isSubmitting || !visit_uuid} type="button">
          {isSubmitting ? t('resubmitting', 'Resubmitting...') : t('resubmit', 'Resubmit')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ClaimLineResubmitModal;
