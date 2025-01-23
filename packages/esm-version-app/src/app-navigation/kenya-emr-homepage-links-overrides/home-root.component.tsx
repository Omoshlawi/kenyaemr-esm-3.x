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
      </Routes>
    </BrowserRouter>
  );
};

export default HomeRoot;
