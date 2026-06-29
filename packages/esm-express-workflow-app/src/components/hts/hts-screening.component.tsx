import { EmptyState, useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import React, { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExpressWorkflowConfig } from '../../config-schema';
import { FHIRResource, useConfig } from '@openmrs/esm-framework';
type HtsScreeningPannelProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const HtsScreeningTabPannel: FC<HtsScreeningPannelProps> = ({ patient, patientUuid }) => {
  const { t } = useTranslation();
  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);
  const { hivScreeningFormUuid } = useConfig<ExpressWorkflowConfig>();
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
      headerTitle={t('htsScreening', 'Screening')}
      displayText={t('screenings', 'Screenings')}
      launchForm={() => {
        launchFormEntryWorkspace(
          {
            workspaceTitle: t('htsScreningForm', 'HIV Screening Form'),
            form: { uuid: hivScreeningFormUuid },
            encounterUuid: '',
          },
          {},
          groupProps,
        );
      }}
    />
  );
};

export default HtsScreeningTabPannel;
