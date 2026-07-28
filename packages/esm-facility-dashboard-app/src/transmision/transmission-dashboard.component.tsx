import React from 'react';
import FacilityDashboardHeader from '../components/header/header.component';
import { useTranslation } from 'react-i18next';
import styles from './transmission.scss';
import TransmissionPipelineTabs from './transmission-pipeline-tabs.component';
import { Layer } from '@carbon/react';

const DataTransmissionDashboard = () => {
  const { t } = useTranslation();
  return (
    <Layer className={styles.tabsContainer}>
      <FacilityDashboardHeader title={t('dataTransmission', 'Data Transmission')} />
      <TransmissionPipelineTabs />
    </Layer>
  );
};

export default DataTransmissionDashboard;
