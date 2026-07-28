import React from 'react';
import { InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';

import styles from './patient-diagnosis.scss';
import { useOrderBasket, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { useMarkIncompleteOrdersOnMissingDiagnosis } from './patient-diagnosis.resource';

type PatientDiagnosisContentProps = {
  patientUuid: string;
  patient: fhir.Patient;
};

const PatientDiagnosisComponent: React.FC<{ patientUuid: string }> = ({ patientUuid }) => {
  const { patient } = usePatientChartStore(patientUuid);
  const { orders } = useOrderBasket(patient);
  const hasDrugOrder = orders.some((order) => 'drug' in order);

  if (!hasDrugOrder) {
    return null;
  }

  return <PatientDiagnosisContent patientUuid={patientUuid} patient={patient} />;
};

const PatientDiagnosisContent: React.FC<PatientDiagnosisContentProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
  const { hasMainDiagnosis, isLoading, hasDrugOrder } = useMarkIncompleteOrdersOnMissingDiagnosis(patientUuid, patient);

  if (isLoading) {
    return null;
  }

  if (hasMainDiagnosis) {
    return null;
  }

  if (!hasDrugOrder) {
    return null;
  }

  return (
    <InlineNotification
      className={styles.noMainDiagnosis}
      aria-label="closes notification"
      kind="warning-alt"
      role="status"
      lowContrast={true}
      statusIconDescription="notification"
      subtitle={t(
        'noMainDiagnosisSubtitleWarning',
        'Main diagnosis is required, please add main diagnosis to the clinical encounter form',
      )}
      title={t('noMainDiagnosis', 'Main diagnosis required')}
      hideCloseButton={true}
    />
  );
};

export default PatientDiagnosisComponent;
