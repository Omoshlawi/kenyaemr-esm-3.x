import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { OverflowMenuItem } from '@carbon/react';
import { launchWorkspace2, type Visit } from '@openmrs/esm-framework';
import styles from './custom-start-visit-button.scss';
import { type VisitFormProps } from '../start-visit-workspace/start-visit-form.workspace';

interface StartVisitOverflowMenuItemProps {
  patient: fhir.Patient;
  closeMenu?: () => void;
}

const StartVisitOverflowMenuItem: React.FC<StartVisitOverflowMenuItemProps> = ({ patient, closeMenu }) => {
  const { t } = useTranslation();
  const isDeceased = Boolean(patient?.deceasedDateTime);
  const patientUuid = patient?.id;

  const handleLaunchModal = useCallback(
    () =>
      launchWorkspace2<VisitFormProps, {}, {}>(
        'custom-start-visit-workspace-form',
        { openedFrom: 'patient-chart-start-visit' },
        {},
        { patient, patientUuid },
      ),
    [patient, patientUuid],
  );

  if (isDeceased) {
    return null;
  }
  return (
    <OverflowMenuItem
      className={styles.menuitem}
      itemText={t('addVisit', 'Add visit')}
      onClick={handleLaunchModal}
      closeMenu={closeMenu}
    />
  );
};

export default StartVisitOverflowMenuItem;
