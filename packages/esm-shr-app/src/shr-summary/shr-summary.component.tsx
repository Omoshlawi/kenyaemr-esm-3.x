import { DataTableSkeleton, Layer, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import usePatientIdentifiers from '../hooks/usePatientIdentifiers';
import HieSHRDashboardComponent from './hie-shr-dashboard/hie-shr-dashboard.component';

type SHRSummaryPanelProps = {
  patientUuid: string;
  patient: fhir.Patient;
};

const SHRSummaryPanel: FC<SHRSummaryPanelProps> = ({ patient, patientUuid }) => {
  const { t } = useTranslation();
  const { error, isLoading } = usePatientIdentifiers(patientUuid);

  if (isLoading) {
    return <DataTableSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={t('shrSummary', 'SHR Summary')} />;
  }

  return (
    <Layer>
      <Tabs>
        <TabList aria-label={t('listOfTabs', 'List of SHR tabs')} contained>
          <Tab>{t('sharedHealthRecords', 'SHARED HEALTH RECORDS (HIE)')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <HieSHRDashboardComponent patientUuid={patientUuid} patient={patient} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Layer>
  );
};

export default SHRSummaryPanel;
