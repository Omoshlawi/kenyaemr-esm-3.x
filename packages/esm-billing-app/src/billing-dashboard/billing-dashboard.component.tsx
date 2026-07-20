import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import BillingHeader from '../billing-header/billing-header.component';
import BillingTabs from '../billing-tabs/billling-tabs.component';
import MetricsCards from '../metrics-cards/metrics-cards.component';
import ClaimsCards from '../metrics-cards/claims-cards.component';
import RootComponent from '../root.component'; // Import your router
import styles from './billing-dashboard.scss';
import { ClockOutStrip } from './clock-out-strip.component';
import { UserHasAccess } from '@openmrs/esm-framework';

// Tab indices: 0=Patient Bills, 1=Bills Today, 2=Claims, 3=Pre-Authorization
const CLAIMS_TAB_INDEX = 2;
const PREAUTH_TAB_INDEX = 3;

function BillingDashboard() {
  const { t } = useTranslation();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [claimsFromDate, setClaimsFromDate] = useState<string>(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [claimsToDate, setClaimsToDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

  const currentPath = window.location.pathname;
  const isMainDashboard = currentPath.endsWith('/accounting') || currentPath.endsWith('/accounting/');
  const isClaimsOrPreAuth = activeTabIndex === CLAIMS_TAB_INDEX || activeTabIndex === PREAUTH_TAB_INDEX;

  const handleClaimsDateChange = (fromDate: string, toDate: string) => {
    setClaimsFromDate(fromDate);
    setClaimsToDate(toDate);
  };

  if (isMainDashboard) {
    return (
      <main className={styles.container}>
        <BillingHeader title={t('home', 'Home')} />
        <ClockOutStrip />
        <UserHasAccess privilege="o3: View Billing Metrics">
          {isClaimsOrPreAuth ? <ClaimsCards fromDate={claimsFromDate} toDate={claimsToDate} /> : <MetricsCards />}
        </UserHasAccess>
        <BillingTabs
          onTabChange={setActiveTabIndex}
          claimsFromDate={claimsFromDate}
          claimsToDate={claimsToDate}
          onClaimsDateChange={handleClaimsDateChange}
        />
      </main>
    );
  }

  return <RootComponent />;
}

export default BillingDashboard;
