import {
  DataTable,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@carbon/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import ExtractedDataset from './extracted-dataset.component';
import { TransmissionPipeline } from './transmission.type';
import PushedDataset from './pushed-dataset.component';
import FailedDataset from './failed-datasent.component';

type PipelineTabPannelProps = {
  pipeline: TransmissionPipeline;
};

const PipelineTabPannel: React.FC<PipelineTabPannelProps> = ({ pipeline }) => {
  const { t } = useTranslation();

  return (
    <Tabs>
      <TabList contained>
        <Tab>{t('extractedDatasets', 'Extracted datasets')}</Tab>
        <Tab>{t('pushedDatasets', 'Pushed datasets')}</Tab>
        <Tab>{t('failedBatches', 'Failed batches')}</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <ExtractedDataset pipeline={pipeline} />
        </TabPanel>

        <TabPanel>
          <PushedDataset pipeline={pipeline} />
        </TabPanel>

        <TabPanel>
          <FailedDataset pipeline={pipeline} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

export default PipelineTabPannel;
