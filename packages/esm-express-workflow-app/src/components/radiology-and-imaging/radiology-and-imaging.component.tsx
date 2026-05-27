import React from 'react';
import ExtensionTabs from '../../shared/tabs/extension-tabs.component';

type RadiologyAndImagingTabsProps = {
  patientUuid: string;
};

const RadiologyAndImagingTabs: React.FC<RadiologyAndImagingTabsProps> = ({ patientUuid }) => {
  return <ExtensionTabs extensionSlotName="patient-imaging-tabs-slot" patientUuid={patientUuid} />;
};

export default RadiologyAndImagingTabs;
