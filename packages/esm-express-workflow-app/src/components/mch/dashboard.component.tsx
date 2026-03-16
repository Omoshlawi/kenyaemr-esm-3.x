import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { spaBasePath } from '../../constants';
import MCH from './mch.component';

type MchDashboardProps = {
  dashboardTitle: string;
};

const MCHDashboard: React.FC<MchDashboardProps> = ({ dashboardTitle }) => {
  return (
    <BrowserRouter basename={`${spaBasePath}/mch`}>
      <Routes>
        <Route path="/" element={<MCH dashboardTitle={dashboardTitle} />} />
      </Routes>
    </BrowserRouter>
  );
};

export default MCHDashboard;
