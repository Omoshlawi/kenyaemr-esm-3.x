import { FHIRResource, useConfig } from '@openmrs/esm-framework';
import { EmptyState, useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExpressWorkflowConfig } from '../../../config-schema';

type HistoryAndExaminationProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const HistoryAndExamination: React.FC<HistoryAndExaminationProps> = ({ patient, patientUuid }) => {
  const { t } = useTranslation();
  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);
  const { historyAndExaminationFormUuid } = useConfig<ExpressWorkflowConfig>();
  const title = t('historyAndExamination', 'History & Examimnation');
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
            form: { uuid: historyAndExaminationFormUuid },
            encounterUuid: '',
          },
          {},
          groupProps,
        );
      }}
    />
  );
};

export default HistoryAndExamination;
