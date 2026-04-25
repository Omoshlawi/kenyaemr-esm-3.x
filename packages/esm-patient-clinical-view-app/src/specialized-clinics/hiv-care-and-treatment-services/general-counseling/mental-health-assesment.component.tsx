import { FHIRResource } from '@openmrs/esm-framework';
import React, { FC } from 'react';

type MentalHealthAssesmentProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const MentalHealthAssesment: FC<MentalHealthAssesmentProps> = ({ patient, patientUuid }) => {
  return <div>MentalHealthAssesment</div>;
};

export default MentalHealthAssesment;
