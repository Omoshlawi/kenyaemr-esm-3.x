import React, { useState } from 'react';
import { Button, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { deleteInsuranceClaimLine } from './claim.resource';

type ClaimDeleteLineModalProps = {
  onClose: () => void;
  claimLineId?: string;
  visit_uuid?: string;
};

const ClaimDeleteLineModal: React.FC<ClaimDeleteLineModalProps> = ({ onClose, claimLineId, visit_uuid }) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!claimLineId) {
      return;
    }
    setIsSubmitting(true);
    const result = await deleteInsuranceClaimLine(claimLineId, visit_uuid || '');

    if (result.success) {
      showSnackbar({
        kind: 'success',
        title: t('deleteLine', 'Delete line'),
        subtitle: t('lineDeleted', 'Line deleted successfully'),
        timeoutInMs: 3000,
      });
      onClose();
    } else {
      showSnackbar({
        kind: 'error',
        title: t('deleteLineError', 'Delete line error'),
        subtitle: result.upstreamError || t('deleteLineFailed', 'Failed to delete line'),
        timeoutInMs: 4000,
      });
      onClose();
    }

    setIsSubmitting(false);
  };

  return (
    <>
      <ModalHeader>{t('deleteLine', 'Delete line item')}</ModalHeader>
      <ModalBody>
        <p>{t('deleteLineConfirm', 'Are you sure you want to delete this line item?')}</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} type="button">
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleDelete} disabled={isSubmitting || !claimLineId} type="button">
          {isSubmitting ? t('deleting', 'Deleting...') : t('delete', 'Delete')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ClaimDeleteLineModal;
