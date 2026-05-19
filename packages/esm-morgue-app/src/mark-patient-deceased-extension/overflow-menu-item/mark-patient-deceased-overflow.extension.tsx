import React, { useCallback } from 'react';
import { OverflowMenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';

import styles from './mark-patient-deceased-overflow.scss';

interface MarkPatientDeceasedOverflowMenuItemProps {
  patientUuid?: string;
  patient?: fhir.Patient;
}

const MarkPatientDeceasedOverflowMenuItem: React.FC<MarkPatientDeceasedOverflowMenuItemProps> = ({
  patient,
  patientUuid,
}) => {
  const { t } = useTranslation();
  const { visitContext, mutateVisitContext } = usePatientChartStore(patientUuid);
  const isDead = patient.deceasedBoolean ?? Boolean(patient.deceasedDateTime);

  const handleLaunchModal = useCallback(
    () =>
      launchWorkspace2(
        'mortuary-mark-patient-deceased-workspace-form',
        { patientUuid },
        {},
        { patient, patientUuid, visitContext, mutateVisitContext },
      ),
    [patient, patientUuid, visitContext, mutateVisitContext],
  );

  return (
    patient &&
    !isDead && (
      <OverflowMenuItem
        className={styles.menuitem}
        itemText={t('markPatientDeceased', 'Mark patient deceased')}
        onClick={handleLaunchModal}
      />
    )
  );
};

export default MarkPatientDeceasedOverflowMenuItem;
