import { ExtensionSlot } from '@openmrs/esm-framework';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const LinkageServicesRoot = () => {
  const baseName = window.getOpenmrsSpaBase() + 'home/linkage-services';

  return (
    <BrowserRouter basename={baseName}>
      <Routes>
        <Route
          path="/community-pharmacy/*"
          element={<ExtensionSlot name="linkage-services-community-pharmacy-slot" />}
        />
        <Route path="/case-management/*" element={<ExtensionSlot name="linkage-services-case-management-slot" />} />
        <Route path="/peer-calendar/*" element={<ExtensionSlot name="linkage-services-peer-calendar-slot" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default LinkageServicesRoot;
