import React from 'react';
import { type FormEntryProps } from '@openmrs/esm-patient-common-lib';
import { ModalHeader, ModalBody } from '@carbon/react';
import { ExtensionSlot } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

type FormEntryModalProps = {
  closeModal: () => void;
  formEntryProps: FormEntryProps;
  formUuid: string;
};

const FormEntryModal: React.FC<FormEntryModalProps> = ({ closeModal, formEntryProps, formUuid }) => {
  const { t } = useTranslation();
  const modalState = {
    ...formEntryProps,
    closeWorkspace: () => closeModal(),
    formUuid,
    closeWorkspaceWithSavedChanges: () => closeModal(),
  };
  return (
    <>
      <ModalHeader>{t('clinicalFormEntry', 'Clinical Form')}</ModalHeader>
      <ModalBody>
        <ExtensionSlot key={formUuid} name="form-widget-slot" state={modalState} />
      </ModalBody>
    </>
  );
};

export default FormEntryModal;
