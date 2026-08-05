import { Layer } from '@carbon/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePipelineMetrics } from './transmission.resources';
import { TransmissionPipeline } from './transmission.type';
import styles from './pipeline-summary.scss';

type PipelineSummaryProps = {
  pipeline: TransmissionPipeline;
};
const PipelineSummary: React.FC<PipelineSummaryProps> = ({ pipeline }) => {
  const { queueItems, configItems } = usePipelineMetrics(pipeline);
  const { t } = useTranslation();

  return (
    <Layer className={styles.container}>
      <div className={styles.metricsContainer}>
        {queueItems.map((item, index) => (
          <div key={index} className={styles.metricItem}>
            <span>{item.label}:</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <div className={styles.configContainer}>
        {configItems.map((item, index) => (
          <div key={index} className={styles.metricItem}>
            <span>{item.label}:</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </Layer>
  );
};

export default PipelineSummary;
