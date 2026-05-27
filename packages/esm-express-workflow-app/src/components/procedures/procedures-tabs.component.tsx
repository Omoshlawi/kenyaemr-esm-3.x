import React from 'react';

import ExtensionTabs from '../../shared/tabs/extension-tabs.component';

type ProceduresTabsProps = {
  patientUuid: string;
};

const ProceduresTabs: React.FC<ProceduresTabsProps> = ({ patientUuid }) => {
  return <ExtensionTabs extensionSlotName="patient-procedure-tabs-slot" patientUuid={patientUuid} />;
};

export default ProceduresTabs;
