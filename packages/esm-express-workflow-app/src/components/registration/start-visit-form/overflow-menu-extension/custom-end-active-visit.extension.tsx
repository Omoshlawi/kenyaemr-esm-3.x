import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { showModal, useVisit } from '@openmrs/esm-framework';
import { OverflowMenuItem } from '@carbon/react';
import styles from './overflow-menu-item.scss';

interface StopVisitOverflowMenuItemProps {
  patientUuid: string;
  closeMenu?: () => void;
}

let isEndVisitDialogOpen = false;

const StopVisitOverflowMenuItem: React.FC<StopVisitOverflowMenuItemProps> = ({ patientUuid, closeMenu }) => {
  const { t } = useTranslation();
  const { activeVisit } = useVisit(patientUuid);

  const handleLaunchModal = useCallback(() => {
    if (isEndVisitDialogOpen) {
      return;
    }
    isEndVisitDialogOpen = true;
    const dispose = showModal('custom-end-visit-dialog', {
      closeModal: () => {
        isEndVisitDialogOpen = false;
        dispose();
      },
      patientUuid,
    });
  }, [patientUuid]);

  return (
    activeVisit && (
      <OverflowMenuItem
        className={styles.menuitem}
        itemText={`${t('endCustomActiveVisit', 'End Active Visit')}`}
        onClick={handleLaunchModal}
        closeMenu={closeMenu}
      />
    )
  );
};

export default StopVisitOverflowMenuItem;
