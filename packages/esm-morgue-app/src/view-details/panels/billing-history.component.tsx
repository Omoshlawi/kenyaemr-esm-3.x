import React from 'react';
import { ExtensionSlot } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

interface RouteParams {
  patientUuid: string;
  [key: string]: string | undefined;
}

const BillingHistoryView: React.FC = () => {
  const { t } = useTranslation();
  const { patientUuid } = useParams<RouteParams>();

  return <ExtensionSlot name="patient-chart-billing-dashboard-slot" state={{ patientUuid }} />;
};

export default BillingHistoryView;
