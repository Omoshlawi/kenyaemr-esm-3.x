import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import BillingDashboard from './billing-dashboard/billing-dashboard.component';
import ResubmitClaimPage from './claims/claims-management/pages/resubmit-claim-page.component';
import ClaimScreen from './claims/patient-dashboard/claims-dashboard.component';
import Invoice from './invoice/invoice.component';
import { ClockInBoundary } from './bill-administration/payment-points/clock-in-boundary.component';

const RootComponent: React.FC = () => {
  const baseName = window.getOpenmrsSpaBase() + 'home/accounting';

  return (
    <BrowserRouter basename={baseName}>
      <Routes>
        <Route path="/" element={<BillingDashboard />} />
        <Route path="/resubmit-claim/:patientUuid/consent-token/:consentToken" element={<ResubmitClaimPage />} />
        <Route
          path="/patient/:patientUuid/:billUuid"
          element={
            <ClockInBoundary>
              <Invoice />
            </ClockInBoundary>
          }
        />
        <Route
          path="/patient/:patientUuid/:billUuid/claims"
          element={
            <ClockInBoundary>
              <ClaimScreen />
            </ClockInBoundary>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default RootComponent;
