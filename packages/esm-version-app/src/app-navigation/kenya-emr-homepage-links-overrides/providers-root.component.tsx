import { ExtensionSlot } from '@openmrs/esm-framework';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const ProvidersRoot = () => {
  const baseName = window.getOpenmrsSpaBase() + 'home/providers';

  return (
    <BrowserRouter basename={baseName}>
      <Routes>
        <Route path="/" element={<ExtensionSlot name="providers-dashboard-slot" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default ProvidersRoot;
