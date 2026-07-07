import { InlineLoading } from '@carbon/react';
import { useConfig } from '@openmrs/esm-framework';
import React from 'react';
import { LabManifestConfig } from '../config-schema';
import useIsKDoDSite from '../hooks/useIsKDoDSite';
import usePatient from '../hooks/usePatient';
import { findPatientHeiIdentifier, formatHeiNumberForDisplay } from '../utils/patient-identifier-display';

type Props = {
  patientUuid: string;
  useHeiNumber?: boolean;
};

const PatientCCCNumbercell: React.FC<Props> = ({ patientUuid, useHeiNumber = false }) => {
  const { isLoading, patient } = usePatient(patientUuid);
  const {
    patientIdentifierTypes: { cccNumberIdentifierType, kdodIdentifierType, heiNumberIdentifierType },
  } = useConfig<LabManifestConfig>();
  const { isKDoDSite, isLoading: siteLoading } = useIsKDoDSite();

  if (isLoading || siteLoading) {
    return <InlineLoading status="active" iconDescription="Loading" />;
  }

  const cccIdentifierType = isKDoDSite ? kdodIdentifierType : cccNumberIdentifierType;
  const identifier = useHeiNumber
    ? findPatientHeiIdentifier(patient?.identifiers, heiNumberIdentifierType)
    : patient?.identifiers?.find((id) => id.identifierType.uuid === cccIdentifierType)?.identifier;
  const displayIdentifier = useHeiNumber ? formatHeiNumberForDisplay(identifier) : identifier;

  return <>{displayIdentifier || '--'}</>;
};

export default PatientCCCNumbercell;
