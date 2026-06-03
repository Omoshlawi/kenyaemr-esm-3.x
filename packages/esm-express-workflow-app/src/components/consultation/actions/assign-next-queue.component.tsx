import { Button } from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';
import { showModal } from '@openmrs/esm-framework';
import { usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import React from 'react';
import { useTranslation } from 'react-i18next';

type AssignNextQueueProps = {
  patientUuid: string;
};
const AssignNextQueue: React.FC<AssignNextQueueProps> = ({ patientUuid }) => {
  const { visitContext } = usePatientChartStore(patientUuid);
  const { t } = useTranslation();

  const onMovePatientToQueue = () => {
    const dispose = showModal('transition-patient-to-latest-queue-modal', {
      closeModal: () => {
        dispose();
      },
      activeVisit: visitContext,
    });
  };
  return (
    <Button kind="primary" size="md" onClick={onMovePatientToQueue} renderIcon={ArrowRight}>
      {t('assignNextQueue', 'Assign next queue')}
    </Button>
  );
};

export default AssignNextQueue;
