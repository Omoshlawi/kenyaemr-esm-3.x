import React from 'react';
import { Button } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import { launchWorkspace2, Order, restBaseUrl, useConfig } from '@openmrs/esm-framework';

type LaunchResultsButtonProps = {
  order: Order;
};

const LaunchResultsButton: React.FC<LaunchResultsButtonProps> = ({ order }) => {
  const { t } = useTranslation();
  const { malariaConceptUuids } = useConfig();
  const isMalariaOrder = malariaConceptUuids.includes(order.concept.uuid);

  const invalidateLabOrders = () => {
    mutate((key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/order`));
  };

  const launchTestResultsWorkspace = (workspaceName: string) => {
    launchWorkspace2(
      workspaceName,
      {
        patient: order.patient,
        order,
        invalidateLabOrders,
      },
      {
        patient: order.patient,
        patientUuid: order.patient.uuid,
        encounterUuid: order.encounter?.uuid ?? '',
        visitContext: order.encounter?.visit ?? null,
      },
    );
  };
  return (
    <Button
      size="sm"
      onClick={() =>
        launchTestResultsWorkspace(
          isMalariaOrder ? 'exported-patient-clinical-view-lab-results-form' : 'lab-app-test-results-form-workspace',
        )
      }
      renderIcon={Add}>
      {t('addLabResults', 'Add Lab Results')}
    </Button>
  );
};

export default LaunchResultsButton;
