import React from 'react';
import ExtensionTabs from '../../../shared/tabs/extension-tabs.component';

type ClinicalEncounterProps = {
  patientUuid: string;
};

const ClinicalEncounter: React.FC<ClinicalEncounterProps> = ({ patientUuid }) => {
  return <ExtensionTabs extensionSlotName="clinical-encounter-tabs-slot" patientUuid={patientUuid} />;
};

export default ClinicalEncounter;
