import React, { FC } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { spaBasePath } from '../../constants';
import HIVTestingServices from './hts.components';
type HTSDasboardProps = {
  dashboardTitle: string;
};
const HTSDasboard: FC<HTSDasboardProps> = ({ dashboardTitle }) => {
  return (
    <BrowserRouter basename={`${spaBasePath}/hts`}>
      <Routes>
        <Route path="/" element={<HIVTestingServices dashboardTitle={dashboardTitle} />} />
      </Routes>
    </BrowserRouter>
  );
};

export default HTSDasboard;
