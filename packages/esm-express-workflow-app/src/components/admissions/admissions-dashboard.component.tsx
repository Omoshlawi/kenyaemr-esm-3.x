import { Layer } from '@carbon/react';
import { ExtensionSlot } from '@openmrs/esm-framework';
import React, { useMemo } from 'react';

type AdmissionsDashboardProps = {
  patientUuid: string;
  patient: Record<string, unknown>;
};

const AdmissionsDashboard: React.FC<AdmissionsDashboardProps> = ({ patientUuid, patient }) => {
  const state = useMemo(() => ({ patientUuid, patient }), [patientUuid, patient]);

  return (
    <Layer>
      <ExtensionSlot name="ewf-admissions-dashboard-slot" state={state} />
    </Layer>
  );
};

export default AdmissionsDashboard;
