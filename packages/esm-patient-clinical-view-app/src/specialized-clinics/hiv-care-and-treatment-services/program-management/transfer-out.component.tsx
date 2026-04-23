import { FHIRResource } from '@openmrs/esm-framework/src';
import { EmptyState } from '@openmrs/esm-patient-common-lib';
import React from 'react';
import { useTranslation } from 'react-i18next';
type TransferOutProps = {
  patientUuid?: string;
  patient?: FHIRResource;
};
const TransferOut: React.FC<TransferOutProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  return <EmptyState headerTitle={t('transferOut', 'Transfer out')} displayText={t('transferOut', 'Transfer out')} />;
};

export default TransferOut;
