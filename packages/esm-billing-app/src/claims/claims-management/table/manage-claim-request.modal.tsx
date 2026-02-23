import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { retryClaim, updateClaimStatus, updateAllClaimStatuses } from '../../dashboard/form/claims-form.resource';
import { useFacilityClaims } from './use-facility-claims';

export const ManageClaimRequest = ({
  closeModal,
  claimId,
  modalType = 'retry',
}: {
  closeModal: () => void;
  claimId?: string;
  modalType: 'retry' | 'update' | 'all';
}) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { claims, mutate } = useFacilityClaims();

  const claim = claimId ? claims.find((claim) => claim.id === claimId) : null;

  const handleRetryClaim = () => {
    setIsSubmitting(true);
    retryClaim(claim.uuid)
      .then(() => {
        mutate();
        showSnackbar({
          kind: 'success',
          title: t('success', 'Success'),
          subtitle: t('succcessfullRetry', 'Claim sent successfully'),
          timeoutInMs: 3000,
        });
      })
      .catch(() => {
        showSnackbar({
          kind: 'error',
          title: t('error', 'Error'),
          subtitle: t('retryClaimError', 'Request Failed, Please try later'),
          timeoutInMs: 2500,
        });
      })
      .finally(() => {
        setIsSubmitting(false);
        closeModal();
      });
  };

  const handleUpdateStatus = () => {
    setIsSubmitting(true);
    updateClaimStatus(claim.uuid)
      .then(() => {
        mutate();
        showSnackbar({
          kind: 'success',
          title: t('success', 'Success'),
          subtitle: t('successfulUpdate', 'Claim status updated successfully'),
          timeoutInMs: 3000,
        });
      })
      .catch(() => {
        showSnackbar({
          kind: 'error',
          title: t('error', 'Error'),
          subtitle: t('updateStatusError', 'Status update failed, Please try later'),
          timeoutInMs: 2500,
        });
      })
      .finally(() => {
        setIsSubmitting(false);
        closeModal();
      });
  };

  const handleUpdateAllStatuses = () => {
    setIsSubmitting(true);
    updateAllClaimStatuses()
      .then(() => {
        mutate();
        showSnackbar({
          kind: 'success',
          title: t('success', 'Success'),
          subtitle: t('allClaimsUpdated', 'All unprocessed claim statuses updated successfully'),
          timeoutInMs: 3000,
        });
      })
      .catch(() => {
        showSnackbar({
          kind: 'error',
          title: t('error', 'Error'),
          subtitle: t('updateAllError', 'Failed to update claim statuses, please try again'),
          timeoutInMs: 3000,
        });
      })
      .finally(() => {
        setIsSubmitting(false);
        closeModal();
      });
  };

  const handleSubmit = () => {
    if (modalType === 'retry') {
      handleRetryClaim();
    } else if (modalType === 'all') {
      handleUpdateAllStatuses();
    } else {
      handleUpdateStatus();
    }
  };

  return (
    <React.Fragment>
      <ModalHeader closeModal={closeModal}>
        {modalType === 'retry'
          ? t('retryClaim', 'Retry Claim')
          : modalType === 'all'
          ? t('updateAllStatuses', 'Update All Statuses')
          : t('updateClaimStatus', 'Update Claim Status')}
      </ModalHeader>
      <ModalBody>
        {modalType === 'retry'
          ? t('retryClaimMessage', `Are you sure you want to retry making the request for ${claim?.claimCode}?`)
          : modalType === 'all'
          ? t('updateAllStatusesMessage', 'Are you sure you want to update all unprocessed claim statuses?')
          : t('updateStatusMessage', `Are you sure you want to update claim status for ${claim?.claimCode}?`)}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} type="button" disabled={isSubmitting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <InlineLoading status="active" />
              {modalType === 'retry' ? t('retrying', 'Retrying...') : t('updating', 'Updating...')}
            </>
          ) : modalType === 'retry' ? (
            t('retry', 'Retry')
          ) : (
            t('update', 'Update')
          )}
        </Button>
      </ModalFooter>
    </React.Fragment>
  );
};
