import { ExtensionSlot, Patient } from '@openmrs/esm-framework';
import React, { FC } from 'react';
type HivPatientSummaryProps = {
  patientUuid: string;
  patient: Patient;
};
const HivPatientSummary: FC<HivPatientSummaryProps> = ({ patientUuid }) => {
  return <ExtensionSlot name="hiv-patient-summary-slot" state={{ patientUuid }} />;
};

export default HivPatientSummary;
