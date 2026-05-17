import React, { useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

import { deleteGlobalProperty } from '../hooks/useGlobalProperty';

interface DeleteGlobalPropertyModalProps {
  close: () => void;
  property: string;
  uuid: string;
  onDeleted: () => void;
}

const DeleteGlobalPropertyModal: React.FC<DeleteGlobalPropertyModalProps> = ({ close, property, uuid, onDeleted }) => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteGlobalProperty(uuid);
      showSnackbar({
        isLowContrast: true,
        kind: 'success',
        title: t('gpDeleted', 'Global property deleted'),
        subtitle: t('gpDeletedSubtitle', '{{property}} was deleted successfully.', { property }),
      });
      onDeleted();
      close();
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: t('gpDeleteError', 'Error deleting global property'),
        subtitle: error?.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="cds--modal-header">
        <h3 className="cds--modal-header__heading">{t('deleteGlobalProperty', 'Delete global property')}</h3>
      </div>
      <div className="cds--modal-content">
        <p>
          {t(
            'deleteGlobalPropertyConfirmation',
            'Are you sure you want to delete the global property "{{property}}"?',
            {
              property,
            },
          )}
        </p>
        <p>{t('deleteGlobalPropertyWarning', 'This action cannot be undone.')}</p>
      </div>
      <div className="cds--modal-footer">
        <Button kind="secondary" onClick={close} disabled={isDeleting}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? <InlineLoading description={t('deleting', 'Deleting...')} /> : t('delete', 'Delete')}
        </Button>
      </div>
    </>
  );
};

export default DeleteGlobalPropertyModal;
