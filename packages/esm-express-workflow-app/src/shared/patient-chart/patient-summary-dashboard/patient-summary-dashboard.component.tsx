import React from 'react';
import ExtensionTabs from '../../tabs/extension-tabs.component';

type PatientSummaryDashboardProps = {
  patientUuid: string;
};
const PATIENT_CHART_PATIENT_SUMMARY_EXTENSION_SLOT = 'ewf-patient-chart-patient-summary-tabs-extension-slot';
const PatientSummaryDashboard: React.FC<PatientSummaryDashboardProps> = ({ patientUuid }) => {
  return <ExtensionTabs extensionSlotName={PATIENT_CHART_PATIENT_SUMMARY_EXTENSION_SLOT} patientUuid={patientUuid} />;
};

export default PatientSummaryDashboard;
