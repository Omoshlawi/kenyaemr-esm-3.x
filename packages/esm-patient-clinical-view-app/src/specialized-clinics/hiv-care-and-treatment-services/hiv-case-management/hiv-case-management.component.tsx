import { ExtensionSlot } from '@openmrs/esm-framework';
import React from 'react';

type HivCaseManagementProps = {
  patientUuid: string;
};
const HivCaseManagement: React.FC<HivCaseManagementProps> = ({ patientUuid }) => {
  return <ExtensionSlot name="ewf-case-management-slot" state={{ patientUuid }} />;
};

export default HivCaseManagement;
