import { FHIRResource } from '@openmrs/esm-framework/src';
import { EmptyState } from '@openmrs/esm-patient-common-lib/src';
import React from 'react';
import { useTranslation } from 'react-i18next';

type ServiceDeliveryModelProps = {
  patientUuid?: string;
  patient?: FHIRResource;
};
const ServiceDeliveryModel: React.FC<ServiceDeliveryModelProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  return (
    <EmptyState
      headerTitle={t('serviceDeliveryModel', 'Service delivery model')}
      displayText={t('serviceDeliveryModel', 'Service delivery model')}
    />
  );
};

export default ServiceDeliveryModel;
