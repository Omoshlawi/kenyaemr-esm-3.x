import { Button, ButtonSet, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const DeleteConfirmDialog = ({ onClose, onDelete }) => {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      <ModalHeader closeModal={onClose}>{t('warning', 'Warning!')}</ModalHeader>
      <ModalBody>Are you sure yoiu want to revoke access?</ModalBody>
      <ModalFooter>
        <ButtonSet>
          <Button kind="primary" onClick={onDelete}>
            Revoke
          </Button>
          <Button kind="secondary" onClick={onClose}>
            Cancel
          </Button>
        </ButtonSet>
      </ModalFooter>
    </React.Fragment>
  );
};

export default DeleteConfirmDialog;
