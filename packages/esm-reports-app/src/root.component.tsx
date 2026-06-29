import React from 'react';
import { Routes, BrowserRouter, Route } from 'react-router-dom';
import Header from './components/header/header.component';
import GroupReports from './components/group-reports.component';
import ReportHistory from './components/report-history/report-history.component';
import ReportView from './components/report-view/report-view.component';

const ReportDashboard = () => {
  const spaBasePath = `${(globalThis as any).spaBase}/reporting`;
  return (
    <main>
      <BrowserRouter basename={spaBasePath}>
        <Header />
        <Routes>
          <Route path="/" element={<GroupReports />} />
          <Route path="/report/:reportUuid" element={<ReportHistory />} />
          <Route path="/report/:reportUuid/requests/:requestId" element={<ReportView />} />
        </Routes>
      </BrowserRouter>
    </main>
  );
};

export default ReportDashboard;
