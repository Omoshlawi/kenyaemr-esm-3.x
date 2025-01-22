import { ExtensionSlot } from '@openmrs/esm-framework';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const DiagnosticsRoot = () => {
  const baseName = window.getOpenmrsSpaBase() + 'home/diagnostics';

  return (
    <BrowserRouter basename={baseName}>
      <Routes>
        <Route path="/lab-manifest/*" element={<ExtensionSlot name="diagnostics-lab-manifest-slot" />} />
        <Route path="/laboratory/*" element={<ExtensionSlot name="diagnostics-laboratory-slot" />} />
        <Route path="/procedure/*" element={<ExtensionSlot name="diagnostics-procedures-slot" />} />
        <Route path="/imaging-orders/*" element={<ExtensionSlot name="diagnostics-imaging-orders-slot" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default DiagnosticsRoot;
