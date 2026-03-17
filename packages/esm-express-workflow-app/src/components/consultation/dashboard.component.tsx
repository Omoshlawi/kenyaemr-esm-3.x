import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { spaBasePath } from '../../constants';
import Consultation from './consultation.component';

type ConsultationDashboardProps = {
  dashboardTitle: string;
};

const ConsultationDashboard: React.FC<ConsultationDashboardProps> = ({ dashboardTitle }) => {
  return (
    <BrowserRouter basename={`${spaBasePath}/consultation`}>
      <Routes>
        <Route path="/" element={<Consultation dashboardTitle={dashboardTitle} />} />
      </Routes>
    </BrowserRouter>
  );
};

export default ConsultationDashboard;
