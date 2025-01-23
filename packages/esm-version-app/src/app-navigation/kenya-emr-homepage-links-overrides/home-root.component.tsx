import { ExtensionSlot } from '@openmrs/esm-framework';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const HomeRoot = () => {
  const baseName = window.getOpenmrsSpaBase() + 'home';

  return (
    <BrowserRouter basename={baseName}>
      <Routes>
        <Route path="/" element={<ExtensionSlot name="home-dashboard-slot" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default HomeRoot;
