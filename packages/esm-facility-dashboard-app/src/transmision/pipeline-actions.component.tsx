import React, { useState } from 'react';
import { TransmissionPipeline } from './transmission.type';
import { ComboButton, InlineLoading, MenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { drainQueue, getPipelineName, triggerExtraction } from './transmission.resources';
import { restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { mutate } from 'swr';

type PipelineActionsProps = {
  pipeline: TransmissionPipeline;
};

const PipelineActions: React.FC<PipelineActionsProps> = ({ pipeline }) => {
  const { t } = useTranslation();
  const [isTrgeringExtraction, setTriggerExtraction] = useState(false);
  const [isDrainingQueue, setDrainQueue] = useState(false);
  const mutatePipeline = () =>
    mutate(
      (key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/kenyaemril/datapipeline/${pipeline.slug}`),
    );

  const pipelineDisplay = getPipelineName(pipeline.pipeline, t);
  const handleTriggerExtraction = async () => {
    setTriggerExtraction(true);
    try {
      await triggerExtraction(pipeline.slug);
      showSnackbar({
        kind: 'success',
        title: t('success', 'Success'),
        subtitle: t('extractionTriggerSuccess', 'Extraction trigger successfull'),
      });
      mutatePipeline();
    } catch (err: any) {
      showSnackbar({
        kind: 'error',
        title: t('error', 'Error'),
        subtitle: err?.responseBody?.error ?? err?.message,
      });
    } finally {
      setTriggerExtraction(false);
    }
  };
  const handleDrainQueue = async (deadletter: boolean = false) => {
    setDrainQueue(true);
    try {
      await drainQueue(pipeline.slug, deadletter);
      showSnackbar({
        kind: 'success',
        title: t('success', 'Success'),
        subtitle: t('queueDrainedSuccessfully', 'QueueDrained successfully'),
      });
      mutatePipeline();
    } catch (err: any) {
      showSnackbar({
        kind: 'error',
        title: t('error', 'Error'),
        subtitle: err?.responseBody?.error ?? err?.message,
      });
    } finally {
      setDrainQueue(false);
    }
  };
  return (
    <ComboButton label={t('pipelineActions', 'Pipeline actions')} size="md">
      {isTrgeringExtraction ? (
        <InlineLoading description={t('triggeringExtraction', 'Triggering extraction...')} />
      ) : (
        <MenuItem label={t('triggerExtraction', 'Trigger extraction')} onClick={handleTriggerExtraction} />
      )}
      {isDrainingQueue ? (
        <InlineLoading description={t('drainingQueue', 'Draining Queue')} />
      ) : (
        <>
          <MenuItem
            label={t('drainQueue', 'Drain queueu')}
            onClick={() => {
              handleDrainQueue(false);
            }}
          />
          <MenuItem
            label={t('drainQueueAndDeadletter', 'Drain queueu & Requeue dead letter before')}
            onClick={() => {
              handleDrainQueue(true);
            }}
          />
        </>
      )}
    </ComboButton>
  );
};

export default PipelineActions;
