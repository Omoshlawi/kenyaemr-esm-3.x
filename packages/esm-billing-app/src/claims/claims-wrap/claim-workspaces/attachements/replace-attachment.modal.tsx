import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';

interface ReplaceAttachmentModalProps {
  documentType: string;
  filename?: string;
  closeModal: () => void;
  onConfirm: () => Promise<void> | void;
}

const ReplaceAttachmentModal: React.FC<ReplaceAttachmentModalProps> = ({
  documentType,
  filename,
  closeModal,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const prettyType = documentType.replace(/_/g, ' ');

  const handleConfirm = async () => {
    closeModal();
    await onConfirm();
  };

  return (
    <>
      <ModalHeader
        closeModal={closeModal}
        title={t('replaceAttachmentTitle', 'Replace {{type}}?', { type: prettyType })}
      />
      <ModalBody>
        <p>
          {filename
            ? t(
                'replaceAttachmentBodyWithFile',
                'The current file ({{filename}}) will be retired from SHA. You will then need to upload a new file to complete the replacement.',
                { filename },
              )
            : t(
                'replaceAttachmentBody',
                'The current {{type}} will be retired from SHA. You will then need to upload a new file to complete the replacement.',
                { type: prettyType },
              )}
        </p>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--cds-text-secondary, #525252)' }}>
          {t('replaceAttachmentWarning', 'Until the replacement is uploaded the claim will be missing this document.')}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleConfirm}>
          {t('retireAndUploadNew', 'Retire & upload new')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default ReplaceAttachmentModal;
