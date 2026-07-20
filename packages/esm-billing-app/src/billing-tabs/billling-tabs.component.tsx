import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { List, Search, BaggageClaim, TwoFactorAuthentication, User } from '@carbon/react/icons';

import BillsTable from '../bills-table/bills-table.component';
import PatientBillsScreen from '../past-patient-bills/patient-bills-dashboard/patient-bills-dashboard';
import PreauthQueueTable from '../claims/claims-management/table/virtual-claim-preauth/preauth-queue-table.component';
import MainTable from '../claims/claims-management/main-table/main-table.component';
import ActiveVisit from '../visits/visits.component';

type BillingTabsProps = {
  onTabChange?: (index: number) => void;
  claimsFromDate: string;
  claimsToDate: string;
  onClaimsDateChange: (fromDate: string, toDate: string) => void;
};

const BillingTabs = ({ onTabChange, claimsFromDate, claimsToDate, onClaimsDateChange }: BillingTabsProps) => {
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
            <Tab renderIcon={User}>{t('activeVisit', 'Active Visit')}</Tab>
            <Tab renderIcon={Search}>{t('patientBills', 'Patient Bills')}</Tab>
            <Tab renderIcon={List}>{t('billsToday', 'Bills Today')}</Tab>
            <Tab renderIcon={BaggageClaim}>{t('claims', 'Claims')}</Tab>
            <Tab renderIcon={TwoFactorAuthentication}>{t('preAuth', 'Pre-Authorization')}</Tab>
          </TabList>
        </div>
        <TabPanels>
          <TabPanel>{<ActiveVisit />}</TabPanel>
          <TabPanel>{<PatientBillsScreen />}</TabPanel>
          <TabPanel>{<BillsTable isOnActiveTab={activeTabIndex === 2} />}</TabPanel>
          <TabPanel>
            {activeTabIndex === 3 && (
              <MainTable fromDate={claimsFromDate} toDate={claimsToDate} onDateChange={onClaimsDateChange} />
            )}
          </TabPanel>
          <TabPanel>{activeTabIndex === 4 && <PreauthQueueTable />}</TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default BillingTabs;
