import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { List, Search, BaggageClaim, TwoFactorAuthentication } from '@carbon/react/icons';

import BillsTable from '../bills-table/bills-table.component';
import PatientBillsScreen from '../past-patient-bills/patient-bills-dashboard/patient-bills-dashboard';
import ClaimsManagementTable from '../claims/claims-management/table/claims-list-table.component';
import PreauthQueueTable from '../claims/claims-management/table/virtual-claim-preauth/preauth-queue-table.component';
import MainTable from '../claims/claims-management/main-table/main-table.component';

type BillingTabsProps = {
  onTabChange?: (index: number) => void;
};

const BillingTabs = ({ onTabChange }: BillingTabsProps) => {
  const { t } = useTranslation();
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);

  const handleTabChange = ({ selectedIndex }: { selectedIndex: number }) => {
    setActiveTabIndex(selectedIndex);
    onTabChange?.(selectedIndex);
  };

  return (
    <div data-testid="BillingsList-list">
      <Tabs selectedIndex={activeTabIndex} onChange={handleTabChange}>
        <div style={{ display: 'flex' }}>
          <TabList style={{ paddingLeft: '1rem' }} aria-label={t('billingTabs', 'Billing tabs')} contained>
            <Tab renderIcon={Search}>{t('patientBills', 'Patient Bills')}</Tab>
            <Tab renderIcon={List}>{t('billsToday', 'Bills Today')}</Tab>
            <Tab renderIcon={BaggageClaim}>{t('claims', 'Claims')}</Tab>
            <Tab renderIcon={TwoFactorAuthentication}>{t('preAuth', 'Pre-Authorization')}</Tab>
          </TabList>
        </div>
        <TabPanels>
          <TabPanel>{<PatientBillsScreen />}</TabPanel>
          <TabPanel>{<BillsTable isOnActiveTab={activeTabIndex === 1} />}</TabPanel>
          <TabPanel>{activeTabIndex === 2 && <MainTable />}</TabPanel>
          <TabPanel>{activeTabIndex === 3 && <PreauthQueueTable />}</TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default BillingTabs;
