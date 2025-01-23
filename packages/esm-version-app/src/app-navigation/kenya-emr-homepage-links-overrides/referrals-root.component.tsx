import { ExtensionSlot } from '@openmrs/esm-framework';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
const ReferralsRoot = () => {
  const baseName = window.getOpenmrsSpaBase() + 'home/referrals';

  return (
    <BrowserRouter basename={baseName}>
      <Routes>
        <Route path="/" element={<ExtensionSlot name="referrals-slot" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default ReferralsRoot;
