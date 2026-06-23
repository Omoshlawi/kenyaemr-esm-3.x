import { EmptyState } from '@openmrs/esm-patient-common-lib';
import React from 'react';
import { useTranslation } from 'react-i18next';

const HtsTestingPannel = () => {
  const { t } = useTranslation();
  return <EmptyState headerTitle={t('htsTesting', 'Testing')} displayText={t('tests', 'Tests')} />;
};

export default HtsTestingPannel;
