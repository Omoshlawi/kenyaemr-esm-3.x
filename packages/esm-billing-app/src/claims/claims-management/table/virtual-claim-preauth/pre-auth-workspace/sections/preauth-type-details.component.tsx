import React from 'react';
import { type PreauthType } from '../pre-auth-schema';
import SurgicalDetails from './surgical-details.section';
import RenalDetails from './renal-details.section';
import OncologyDetails from './oncology-details.section';
import OpticalDetails from './optical-details.section';
import ImagingDetails from './imaging-details.section';

interface PreauthTypeDetailsProps {
  preauthType: PreauthType;
}

const PreauthTypeDetails: React.FC<PreauthTypeDetailsProps> = ({ preauthType }) => {
  switch (preauthType) {
    case 'SURGICAL':
      return <SurgicalDetails />;
    case 'RENAL':
      return <RenalDetails />;
    case 'ONCOLOGY':
      return <OncologyDetails />;
    case 'OPTICAL':
      return <OpticalDetails />;
    case 'IMAGING':
      return <ImagingDetails />;
    default:
      return null;
  }
};

export default PreauthTypeDetails;
