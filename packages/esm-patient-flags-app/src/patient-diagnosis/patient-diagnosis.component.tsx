import React, { useEffect, useMemo } from 'react';
import { useVisit } from '@openmrs/esm-framework';
import { InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';

import styles from './patient-diagnosis.scss';
import { useOrderBasket, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { useMarkIncompleteOrdersOnMissingDiagnosis } from './patient-diagnosis.resource';

const defaultVisitCustomRepresentation =
  'custom:(uuid,display,voided,indication,startDatetime,stopDatetime,' +
  'encounters:(uuid,display,encounterDatetime,' +
  'form:(uuid,name),location:ref,' +
  'encounterType:ref,' +
  'encounterProviders:(uuid,display,' +
  'provider:(uuid,display)),diagnoses),' +
  'patient:(uuid,display),' +
  'visitType:(uuid,name,display),' +
  'attributes:(uuid,display,attributeType:(name,datatypeClassname,uuid),value),' +
  'location:(uuid,name,display))';

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
        'noMainDiagnosisSubtitle',
        'Main diagnosis is required for claim processing, please add main diagnosis to the clinical encounter form',
      )}
      title={t('noMainDiagnosis', 'Main diagnosis required')}
      hideCloseButton={true}
    />
  );
};

export default PatientDiagnosisComponent;
