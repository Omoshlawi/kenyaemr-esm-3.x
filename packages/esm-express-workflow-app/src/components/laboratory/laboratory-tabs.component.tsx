import React from 'react';
import { useTranslation } from 'react-i18next';
import ExtensionTabs from '../../shared/tabs/extension-tabs.component';

type LaboratoryTabsProps = {
  patientUuid: string;
};

const LaboratoryTabs: React.FC<LaboratoryTabsProps> = ({ patientUuid }) => {
  const { t } = useTranslation();

  return <ExtensionTabs extensionSlotName="patient-laboratory-tabs-slot" patientUuid={patientUuid} />;
};

export default LaboratoryTabs;
