import { CardHeader, ConfigurableLink, FHIRResource, useConfig } from '@openmrs/esm-framework';
import { EmptyState, useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExpressWorkflowConfig } from '../../../config-schema';
import { Button, Layer, Tile } from '@carbon/react';
import styles from './screening-tools.scss';
type ScreeningToolsProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const ScreeningTools: React.FC<ScreeningToolsProps> = ({ patient, patientUuid }) => {
  const { t } = useTranslation();
  const { screeningTools } = useConfig<ExpressWorkflowConfig>();
  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);
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
    <Layer>
      <CardHeader title={t('screeningTools', 'Screening tools')}>
        <></>
      </CardHeader>
      {screeningTools.map(({ formUuid, title }, i) => (
        <div key={i}>
          <Button
            className={styles.btn}
            kind="ghost"
            onClick={() => {
              launchFormEntryWorkspace(
                {
                  workspaceTitle: t(title, title),
                  form: { uuid: formUuid },
                  encounterUuid: '',
                },
                {},
                groupProps,
              );
            }}>
            {t(title, title)}
          </Button>
        </div>
      ))}
    </Layer>
  );
};

export default ScreeningTools;

const FormButton = () => {};
