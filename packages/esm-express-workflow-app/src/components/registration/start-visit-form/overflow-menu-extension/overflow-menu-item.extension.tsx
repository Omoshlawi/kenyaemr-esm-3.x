import React, { useCallback } from 'react';
import { OverflowMenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace2, launchWorkspaceGroup2, type Visit } from '@openmrs/esm-framework';
import styles from './overflow-menu-item.scss';
import { type VisitFormProps } from '../visit-form-workspace/visit-form.workspace';

interface CustomStartVisitOverflowMenuItemProps {
  patientUuid?: string;
  patient?: fhir.Patient;
  closeMenu?: () => void;
}

const CustomStartVisitOverflowMenuItem: React.FC<CustomStartVisitOverflowMenuItemProps> = ({
  patient,
  patientUuid,
  closeMenu,
}) => {
  const { t } = useTranslation();
  const isDeceased = Boolean(patient?.deceasedDateTime);

  const handleLaunchModal = useCallback(async () => {
    const resolvedPatientUuid = patient?.id ?? patientUuid ?? '';

    await launchWorkspaceGroup2('ewf-patient-chart', {
      patient,
      patientUuid: resolvedPatientUuid,
      visitContext: null as unknown as Visit,
      mutateVisitContext: () => {},
    });

    launchWorkspace2<VisitFormProps, {}, {}>(
      'custom-start-visit-workspace-form',
      {
        openedFrom: 'patient-chart-start-visit',
        showPatientHeader: false,
      },
      {},
      null,
    );
  }, [patient, patientUuid]);

  return (
    !isDeceased && (
      <OverflowMenuItem
        className={styles.menuitem}
        itemText={t('customCheckin', 'Check-in patient')}
        onClick={handleLaunchModal}
        closeMenu={closeMenu}
      />
    )
  );
};

export default CustomStartVisitOverflowMenuItem;
