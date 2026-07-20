import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { updateAllClaimStatuses } from '../../patient-dashboard/form/claims-form.resource';
import { useClaims } from './use-facility-claims';

export const ManageClaimRequest = ({ closeModal }: { closeModal: () => void }) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate } = useClaims();

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

  return (
    <React.Fragment>
      <ModalHeader closeModal={closeModal}>{t('updateAllStatuses', 'Update All Statuses')}</ModalHeader>
      <ModalBody>
        {t('updateAllStatusesMessage', 'Are you sure you want to update all unprocessed claim statuses?')}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} type="button" disabled={isSubmitting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button type="button" onClick={handleUpdateAllStatuses} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <InlineLoading status="active" />
              {t('updating', 'Updating...')}
            </>
          ) : (
            t('update', 'Update')
          )}
        </Button>
      </ModalFooter>
    </React.Fragment>
  );
};
