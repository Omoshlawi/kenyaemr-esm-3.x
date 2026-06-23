import { EmptyState } from '@openmrs/esm-patient-common-lib';
import React from 'react';
import { useTranslation } from 'react-i18next';

const HtsScreeningTabPannel = () => {
  const { t } = useTranslation();
  return <EmptyState headerTitle={t('htsScreening', 'Screening')} displayText={t('screenings', 'Screenings')} />;
};

export default HtsScreeningTabPannel;
