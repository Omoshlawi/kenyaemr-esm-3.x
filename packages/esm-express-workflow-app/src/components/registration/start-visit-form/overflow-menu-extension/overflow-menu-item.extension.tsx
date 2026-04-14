import React, { useCallback, useMemo } from 'react';
import { OverflowMenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import styles from './overflow-menu-item.scss';
import { type VisitFormProps } from '../visit-form-workspace/visit-form.workspace';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib/src';

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
  const { visitContext, mutateVisitContext } = usePatientChartStore(patientUuid);
  const workspaceGroupsProps = useMemo(
    () => ({
      patient,
      patientUuid,
      visitContext,
      mutateVisitContext,
    }),
    [patient, patientUuid, visitContext, mutateVisitContext],
  );

  const handleLaunchModal = useCallback(async () => {
    launchWorkspace2<VisitFormProps, {}, {}>(
      'custom-start-visit-workspace-form',
      {
        openedFrom: 'patient-chart-start-visit',
        showPatientHeader: false,
      },
      {},
      workspaceGroupsProps,
    );
  }, [workspaceGroupsProps]);

  return (
    !isDeceased && (
      <OverflowMenuItem
        className={styles.menuitem}
        itemText={t('customCheckin', 'Check in')}
        onClick={handleLaunchModal}
        closeMenu={closeMenu}
      />
    )
  );
};

export default CustomStartVisitOverflowMenuItem;
