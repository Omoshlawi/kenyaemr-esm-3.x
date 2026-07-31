import React from 'react';
import { Routes, BrowserRouter, Route } from 'react-router-dom';
import { useLeftNav } from '@openmrs/esm-framework';
import Dashboard from './components/dashboard/home-dashboard.component';

const AdrAssessmentApp = () => {
  const spaBasePath = `${window.spaBase}/adr-assessment`;
  useLeftNav({ name: 'adr-assessment-page-dashboard-slot', basePath: spaBasePath });

  return (
    <main>
      <BrowserRouter basename={window.spaBase}>
        <Routes>
          <Route path="/adr-assessment" element={<Dashboard />} />
          <Route path="/adr-assessment/:dashboard/*" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </main>
  );
};

export default AdrAssessmentApp;
