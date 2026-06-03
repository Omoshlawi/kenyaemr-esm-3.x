import React from 'react';

import ExtensionTabs from '../../shared/tabs/extension-tabs.component';

type PharmacyTabsProps = {
  patientUuid: string;
};

const PharmacyTabs: React.FC<PharmacyTabsProps> = ({ patientUuid }) => {
  return <ExtensionTabs extensionSlotName={'pharmacy-tabs-slot'} patientUuid={patientUuid} />;
};

export default PharmacyTabs;
