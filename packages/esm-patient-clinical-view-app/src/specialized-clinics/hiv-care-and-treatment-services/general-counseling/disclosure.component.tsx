import { FHIRResource } from '@openmrs/esm-framework';
import React, { FC } from 'react';

type DisclosureProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const Disclosure: FC<DisclosureProps> = ({ patient, patientUuid }) => {
  return <div>Discosure</div>;
};

export default Disclosure;
