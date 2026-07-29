import React, { useMemo, useState } from 'react';
import FacilityDashboardHeader from '../components/header/header.component';
import { useTranslation } from 'react-i18next';
import styles from './transmission.scss';
import TransmissionPipelineTabs from './transmission-pipeline-tabs.component';
import { Layer } from '@carbon/react';
import { TransmissionPipeline } from './transmission.type';
import { useDataPipelines } from './transmission.resources';
import PipelineSummary from './pipeline-summary/pipeline-summary.component';

const DataTransmissionDashboard = () => {
  const { t } = useTranslation();
  const [pipeline, setPipeline] = useState<TransmissionPipeline>();
  const { error, isLoading, mutate, pipelines } = useDataPipelines();
  const activePipeline = useMemo(() => (pipeline ? pipeline : pipelines[0]), [pipeline, pipelines]);

  return (
    <Layer className={styles.tabsContainer}>
      <FacilityDashboardHeader title={t('dataTransmission', 'Data Transmission')} />
      {activePipeline && <PipelineSummary pipeline={activePipeline} />}
      <TransmissionPipelineTabs onActivePipelineChange={setPipeline} />
    </Layer>
  );
};

export default DataTransmissionDashboard;
