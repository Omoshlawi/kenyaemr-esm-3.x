import React from 'react';
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Layer,
  Checkbox,
  Button,
  TextInput,
  TabsSkeleton,
} from '@carbon/react';
import { getPipelineName, useDataPipelines } from './transmission.resources';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import PipelineTabPannel from './pipeline-tab-pannel.component';
const TransmissionPipelineTabs = () => {
  const { error, isLoading, mutate, pipelines } = useDataPipelines();
  const { t } = useTranslation();
  if (isLoading) {
    return <TabsSkeleton />;
  }
  if (error) {
    return <ErrorState headerTitle={t('dataTransmissionPipelines', 'Data transmission pipeline')} error={error} />;
  }
  return (
    <div>
      <Tabs>
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
    </div>
  );
};

export default TransmissionPipelineTabs;
