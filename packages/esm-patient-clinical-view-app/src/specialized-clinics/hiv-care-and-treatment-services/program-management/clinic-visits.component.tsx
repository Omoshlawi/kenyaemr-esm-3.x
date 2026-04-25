import { FHIRResource } from '@openmrs/esm-framework';
import React, { FC } from 'react';
type ClinicVisitsProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const ClinicalVisits: FC<ClinicVisitsProps> = ({ patient, patientUuid }) => {
  return <div>ClinicalVisits</div>;
};

export default ClinicalVisits;
