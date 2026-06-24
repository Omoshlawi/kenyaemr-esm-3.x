import React, { useCallback, useMemo } from 'react';
import { OverflowMenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { launchWorkspace2, useVisit } from '@openmrs/esm-framework';
import styles from './overflow-menu-item.scss';
import { type VisitFormProps } from '../visit-form-workspace/visit-form.workspace';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';

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
  const { activeVisit, currentVisit, currentVisitIsRetrospective } = useVisit(patientUuid);

  // Prefer a truly active (ongoing, non-retrospective) visit for the "edit" affordance.
  // Fall back to currentVisit if your flow allows editing retrospective visits too.
  const editableVisit = activeVisit && !currentVisitIsRetrospective ? activeVisit : null;
  const hasActiveVisit = Boolean(editableVisit);

  const workspaceGroupsProps = useMemo(
    () => ({
      patient,
      patientUuid,
      visitContext,
      mutateVisitContext,
      visitToEdit: editableVisit ?? undefined,
    }),
    [patient, patientUuid, visitContext, mutateVisitContext, editableVisit],
  );

  const handleLaunchModal = useCallback(async () => {
    launchWorkspace2<VisitFormProps, {}, {}>(
      'custom-start-visit-workspace-form',
      {
        openedFrom: hasActiveVisit ? 'patient-chart-edit-visit' : 'patient-chart-start-visit',
        showPatientHeader: false,
      },
      {},
      workspaceGroupsProps,
    );
  }, [workspaceGroupsProps, hasActiveVisit]);

  if (isDeceased) {
    return null;
  }

  return (
    <OverflowMenuItem
      className={styles.menuitem}
      itemText={hasActiveVisit ? t('editVisit', 'Edit visit') : t('customCheckin', 'Check in')}
      onClick={handleLaunchModal}
      closeMenu={closeMenu}
    />
  );
};

export default CustomStartVisitOverflowMenuItem;
