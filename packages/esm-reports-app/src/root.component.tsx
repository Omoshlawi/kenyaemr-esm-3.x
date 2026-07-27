import React from 'react';
import { useLeftNav } from '@openmrs/esm-framework';
import { Routes, BrowserRouter, Route } from 'react-router-dom';
import Header from './components/header/header.component';
import GroupReports from './components/group-reports.component';
import ReportHistory from './components/report-history/report-history.component';
import ReportHistoryDashboard from './components/report-history/report-history-dashboard.component';
import ReportView from './components/report-view/report-view.component';
import LeftPanel from './components/side-menu/left-panel.component';

import styles from './root.scss';

const ReportDashboard = () => {
  const spaBasePath = globalThis.spaBase;
  const reportsBasename = `${globalThis.getOpenmrsSpaBase()}reporting`;

  useLeftNav({
    name: 'reports-left-panel-slot',
    basePath: spaBasePath,
  });

  return (
    <BrowserRouter basename={reportsBasename}>
      <LeftPanel />
      <main className={styles.container}>
        <Header />
        <Routes>
          <Route path="/" element={<GroupReports />} />
          <Route path="/reports-history" element={<ReportHistoryDashboard />} />
          <Route path="/report/:reportUuid" element={<ReportHistory />} />
          <Route path="/report/:reportUuid/requests/:requestId" element={<ReportView />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default ReportDashboard;
