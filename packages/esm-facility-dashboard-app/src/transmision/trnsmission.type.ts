export enum DataPipeline {
  CASE_SURVEILLANCE = 'CASE_SURVEILLANCE',
  VISUALIZATION = 'VISUALIZATION',
  DMI = 'DMI',
}
export type TransmissionPipeline = {
  pipeline: DataPipeline;
  slug: string;
  basePath: string;
  extractionOnDemand: boolean;
  maxRetries: number;
  transmissionBatchSize: number;
  cleanupRetentionDays: number;
};
