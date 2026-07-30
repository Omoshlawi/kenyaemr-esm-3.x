import React from 'react';
import { TransmissionPipeline } from './transmission.type';
import { ComboButton, MenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { getPipelineName } from './transmission.resources';

type PipelineActionsProps = {
  pipeline: TransmissionPipeline;
};

const PipelineActions: React.FC<PipelineActionsProps> = ({ pipeline }) => {
  const { t } = useTranslation();
  const pipelineDisplay = getPipelineName(pipeline.pipeline, t);
  return (
    <ComboButton label={t('pipelineActions', 'Pipeline actions', { pipelineDisplay })} size="md">
      <MenuItem label={t('triggerExtraction', 'Trigger extraction', { pipelineDisplay })} />
      <MenuItem label={t('drain queue', 'Drain queueu', { pipelineDisplay })} />
    </ComboButton>
  );
};

export default PipelineActions;
