import { Button } from '@carbon/react';
import React, { useMemo } from 'react';
import { Order } from '../../types';
import { ExpressWorkflowConfig } from '../../config-schema';
import { useConfig } from '@openmrs/esm-framework';
import { FileStorage } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
type HIVRapidTestOrderResultActionProps = {
  order: Order;
  patientUuid: string;
};
const HIVTestOrderResultAction: React.FC<HIVRapidTestOrderResultActionProps> = ({ order, patientUuid }) => {
  const { hivRapidTestConceptUuid } = useConfig<ExpressWorkflowConfig>();
  const { t } = useTranslation();
  const { mutateVisitContext, visitContext, patient } = usePatientChartStore(patientUuid);
  const groupProps = useMemo(
    () => ({
      patient,
      patientUuid: patientUuid,
      visitContext,
      mutateVisitContext,
    }),
    [patient, patientUuid, visitContext, mutateVisitContext],
  );
  const launchFormEntryWorkspace = useLaunchWorkspaceRequiringVisit(
    patientUuid,
    'efw-hiv-test-order-result-workspace-form',
  );

  if (order.concept.uuid !== hivRapidTestConceptUuid) {
    return null;
  }
  // efw-hiv-test-order-result-workspace-form
  return (
    <Button
      kind="ghost"
      size="sm"
      hasIconOnly
      iconDescription={t('recordResults', 'Record results')}
      renderIcon={FileStorage}
      onClick={() => {
        launchFormEntryWorkspace({ order }, undefined, groupProps);
      }}
    />
  );
};

export default HIVTestOrderResultAction;
