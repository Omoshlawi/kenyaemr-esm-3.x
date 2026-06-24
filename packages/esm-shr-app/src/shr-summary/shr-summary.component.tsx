import { DataTableSkeleton, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';
import usePatientIdentifiers from '../hooks/usePatientIdentifiers';
import DependentsComponent from '../referrals/dependents/dependents.component';
import PatientSHRSummaryTable from './tables/shr-summary-table.component';

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
    <div>
      <Tabs>
        <TabList aria-label="List of tabs" contained>
          <Tab>{t('dependents', 'Dependents')}</Tab>
          <Tab>{t('pullSHRRecords', 'Pull SHR Records')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <DependentsComponent patientUuid={patientUuid} patient={patient} />
          </TabPanel>
          <TabPanel>
            <PatientSHRSummaryTable patient={patient} patientUuid={patientUuid} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default SHRSummaryPanel;
