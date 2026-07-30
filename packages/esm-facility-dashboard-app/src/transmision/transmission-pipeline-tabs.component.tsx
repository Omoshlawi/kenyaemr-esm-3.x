import { Layer, Tab, TabList, TabPanel, TabPanels, Tabs, TabsSkeleton } from '@carbon/react';
import { EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import React from 'react';
import { useTranslation } from 'react-i18next';
import PipelineTabPannel from './pipeline-tab-pannel.component';
import { getPipelineName, useDataPipelines } from './transmission.resources';
import { TransmissionPipeline } from './transmission.type';

type TransmissionPipelineTabsProps = {
  onActivePipelineChange: (pipeline: TransmissionPipeline) => void;
};
const TransmissionPipelineTabs: React.FC<TransmissionPipelineTabsProps> = ({ onActivePipelineChange }) => {
  const { error, isLoading, mutate, pipelines } = useDataPipelines();
  const { t } = useTranslation();

  if (isLoading) {
    return <TabsSkeleton />;
  }
  if (error) {
    return <ErrorState headerTitle={t('dataTransmissionPipelines', 'Data transmission pipeline')} error={error} />;
  }

  if (pipelines.length === 0) {
    return (
      <EmptyState
        headerTitle={t('dataTransmissionPipelines', 'Data transmission pipeline')}
        displayText={t('dataTransmissionPipelines', 'Data transmission pipeline')}
      />
    );
  }
  return (
    <Layer>
      <Tabs
        onChange={({ selectedIndex }) => {
          onActivePipelineChange(pipelines[selectedIndex]);
        }}>
        <TabList contained>
          {pipelines.map((pipeline) => (
            <Tab key={pipeline.slug}>{getPipelineName(pipeline.pipeline, t)}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {pipelines.map((pipeline) => (
            <TabPanel key={pipeline.slug}>
              <PipelineTabPannel pipeline={pipeline} />
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Layer>
  );
};

export default TransmissionPipelineTabs;
