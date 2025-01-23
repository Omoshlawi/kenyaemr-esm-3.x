import { ExtensionSlot } from '@openmrs/esm-framework';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const InpatientRoot = () => {
  const baseName = window.getOpenmrsSpaBase() + 'home/bed-admission';

  return (
    <BrowserRouter basename={baseName}>
      <Routes>
        <Route path="/" element={<ExtensionSlot name="bed-admission-dashboard-slot" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default InpatientRoot;
