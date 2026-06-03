import { FHIRResource, useConfig } from '@openmrs/esm-framework';
import { EmptyState, useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExpressWorkflowConfig } from '../../../config-schema';

type DiagnosisAndManagementProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const DiagnosisAndManagement: React.FC<DiagnosisAndManagementProps> = ({ patient, patientUuid }) => {
  const { t } = useTranslation();
  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);
  const { diagnosisAndManagement } = useConfig<ExpressWorkflowConfig>();
  const title = t('diagnosisAndManagement', 'Diagnosis & Management');
  const groupProps = useMemo(
    () => ({
      patient,
      patientUuid: patientUuid,
      visitContext,
      mutateVisitContext,
    }),
    [patient, patientUuid, visitContext, mutateVisitContext],
  );
  const launchFormEntryWorkspace = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');

  return (
    <EmptyState
      displayText={title}
      headerTitle={title}
      launchForm={() => {
        launchFormEntryWorkspace(
          {
            workspaceTitle: title,
            form: { uuid: diagnosisAndManagement },
            encounterUuid: '',
          },
          {},
          groupProps,
        );
      }}
    />
  );
};

export default DiagnosisAndManagement;
