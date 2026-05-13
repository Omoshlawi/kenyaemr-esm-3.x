import { Column, Grid, Layer } from '@carbon/react';
import {
  Activity,
  Attachment,
  Calendar,
  CloudMonitoring,
  Dashboard,
  IbmWatsonDiscovery,
  Settings,
} from '@carbon/react/icons';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ExtensionTabs, { ExtensionTabItem } from '../../tabs/extension-tabs.component';
import styles from './patient-summary-dashboard.scss';

type PatientSummaryDashboardProps = {
  patientUuid: string;
  patient: fhir.Patient;
};

const PatientSummaryDashboard: React.FC<PatientSummaryDashboardProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
  const state = useMemo(() => ({ patientUuid, patient }), [patientUuid, patient]);
  const items: Array<ExtensionTabItem> = [
    {
      label: t('patientSummary', 'Patient Summary'),
      icon: Dashboard,
      slotName: 'ewf-patient-summary-slot',
      slotClassName: styles.ewfExtensionSlot,
    },
    {
      label: t('vitalsAndAnthropometric', 'Vitals & Anthropometric'),
      icon: Activity,
      slotName: 'ewf-vitals-slot',
      slotClassName: styles.ewfExtensionSlot,
    },
    {
      label: t('carePanel', 'Care Panel'),
      icon: CloudMonitoring,
      slotName: 'ewf-care-panel-slot',
      slotClassName: styles.ewfExtensionSlot,
    },
    {
      label: t('immunizations', 'Immunizations'),
      icon: IbmWatsonDiscovery,
      slotName: 'ewf-immunizations-slot',
      slotClassName: styles.ewfExtensionSlot,
    },
    {
      label: t('relationships', 'Relationships'),
      icon: Settings,
      slotName: 'ewf-relationships-slot',
      slotClassName: styles.ewfExtensionSlot,
    },
    {
      label: t('appointments', 'Appointments'),
      icon: Calendar,
      slotName: 'ewf-appointments-slot',
      slotClassName: styles.ewfExtensionSlot,
    },
    {
      label: t('attachments', 'Attachments'),
      icon: Attachment,
      slotName: 'ewf-attachments-slot',
      slotClassName: styles.ewfExtensionSlot,
    },
  ];

  return (
    <Layer>
      <Grid condensed>
        <Column lg={16} md={8} sm={4}>
          <ExtensionTabs items={items} state={state} />
        </Column>
      </Grid>
    </Layer>
  );
};

export default PatientSummaryDashboard;
