import React from 'react';
import { TransmissionPipeline } from './trnsmission.type';

type PipelineTabPannelProps = {
  pipeline: TransmissionPipeline;
};
const PipelineTabPannel: React.FC<PipelineTabPannelProps> = ({ pipeline }) => {
  return (
    <div>
      <pre>{JSON.stringify(pipeline, null, 2)}</pre>
    </div>
  );
};

export default PipelineTabPannel;
