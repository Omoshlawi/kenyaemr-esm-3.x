import React from 'react';
import { ExtensionSlot } from '@openmrs/esm-framework';

import styles from './patient-info.scss';

type PatientInfoComponentProps = {
  patient: fhir.Patient;
  renderedFrom: string;
};

const PatientInfoComponent: React.FC<PatientInfoComponentProps> = ({ patient, renderedFrom = 'patient-chart' }) => {
  const patientUuid = patient.id;

  return (
    <ExtensionSlot
      className={styles.container}
      name="extended-patient-info"
      state={{ patient, patientUuid, renderedFrom }}
    />
  );
};

export default PatientInfoComponent;
