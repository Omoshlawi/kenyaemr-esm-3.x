import { Button, Layer } from '@carbon/react';
import { showModal, type Visit } from '@openmrs/esm-framework';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './procedure-form-extras.scss';
import { ArrowRight } from '@carbon/react/icons';

type ProcedureFormExtrasProps = {
  visitContext: Visit;
  patient: fhir.Patient;
};
const ProcedureFormExtras: FC<ProcedureFormExtrasProps> = ({ visitContext, patient }) => {
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
    <Layer className={styles.gridRow}>
      <Button kind="ghost" size="md" onClick={onMovePatientToQueue} renderIcon={ArrowRight}>
        {t('moveToProcedureQueue', 'Move to procedure queue')}
      </Button>
    </Layer>
  );
};

export default ProcedureFormExtras;
