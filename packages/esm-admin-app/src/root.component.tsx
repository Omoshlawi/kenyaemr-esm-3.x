import React from 'react';
import { useLeftNav } from '@openmrs/esm-framework';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import LeftPanel from './components/side-menu/left-pannel.component';
import UserManagentLandingPage from './components/users/manage-users/manage-user.component';
import EtlAdminDashboard from './components/dashboard/etl-dashboard.component';
import FacilitySetup from './components/facility-setup/facility-setup.component';
import HomeComponent from './components/locations/home/home-locations.component';

import styles from './root.scss';
import GlobalPropertyDashboard from './components/global-property/dashboard/global-property-dashboard.component';

const Root: React.FC = () => {
  const spaBasePath = globalThis.spaBase;
  const adminBasename = globalThis.getOpenmrsSpaBase() + 'admin';
  useLeftNav({
    name: 'admin-left-panel-slot',
    basePath: spaBasePath,
  });

  return (
    <BrowserRouter basename={adminBasename}>
      <LeftPanel />
      <main className={styles.container}>
        <Routes>
          <Route path="/" element={<UserManagentLandingPage />} />
          <Route path="/user-management" element={<UserManagentLandingPage />} />
          <Route path="/etl-administration" element={<EtlAdminDashboard />} />
          <Route path="/facility-setup" element={<FacilitySetup />} />
          <Route path="/locations" element={<HomeComponent />} />
          <Route path="/global-property" element={<GlobalPropertyDashboard />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default Root;
