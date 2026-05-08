import React, { useMemo } from 'react';
import { Layer } from '@carbon/react';
import { ExtensionSlot } from '@openmrs/esm-framework';

type PreauthDashboardProps = {
  patientUuid: string;
  patient: fhir.Patient;
};

const PreauthDashboard: React.FC<PreauthDashboardProps> = ({ patientUuid, patient }) => {
  const state = useMemo(() => ({ patientUuid, patient }), [patientUuid, patient]);

  return (
    <Layer>
      <ExtensionSlot name="ewf-preauth-dashboard-slot" state={state} />
    </Layer>
  );
};

export default PreauthDashboard;
