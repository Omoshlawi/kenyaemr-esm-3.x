import { ExtensionSlot, useExtensionStore } from '@openmrs/esm-framework';
import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const HomeRoot = () => {
  const baseName = window.getOpenmrsSpaBase() + 'home';

  //   const store = useExtensionStore();

  //   return (
  //     <pre>
  //       {JSON.stringify(
  //         store.slots['homepage-dashboard-slot'].assignedExtensions.map((e) => e.name),
  //         null,
  //         2,
  //       )}
  //     </pre>
  //   );

  return (
    <BrowserRouter basename={baseName}>
      <Routes>
        <Route path="/" element={<ExtensionSlot name="home-dashboard-slot" />} />
        <Route path="/appointments/*" element={<ExtensionSlot name="clinical-appointments-dashboard-slot" />} />
        <Route path="/providers/*" element={<ExtensionSlot name="providers-dashboard-slot" />} />
        <Route path="/referrals/*" element={<ExtensionSlot name="referrals-slot" />} />
        <Route path="/bed-admission/*" element={<ExtensionSlot name="bed-admission-dashboard-slot" />} />
        <Route path="/service-queues/*" element={<ExtensionSlot name="service-queues-dashboard-slot" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default HomeRoot;
