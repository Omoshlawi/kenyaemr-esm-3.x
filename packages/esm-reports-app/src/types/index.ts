export type ReportDescriptor = {
  uuid: string;
  name: string;
  description: string | null;
  type: 'IndicatorReportDescriptor' | 'HybridReportDescriptor' | 'CalculationReportDescriptor';
  indicator: boolean;
  hybrid: boolean;
  template?: string | null;
  repeatingSection?: string | null;
};

export type ReportCategory = {
  name: string;
  indicator: Array<ReportDescriptor>;
  patientFollowUpReports: Array<ReportDescriptor>;
};

export type ReportsResponse = {
  appId: string;
  results: Array<ReportCategory>;
};

export type ReportParameterType =
  | 'java.util.Date'
  | 'java.lang.String'
  | 'java.lang.Integer'
  | 'java.lang.Long'
  | 'java.lang.Double'
  | 'java.lang.Boolean';

export interface ReportParameter {
  name: string;
  label: string;
  type: ReportParameterType | string;
  defaultValue: string | number | boolean | null;
}

export interface ReportDefinition {
  uuid: string;
  name: string;
  description: string;
  parameters: Array<ReportParameter>;
  dataSets: Array<string>;
}

export type ReportWithDefinition = ReportDescriptor & {
  requestUrl: string;
  requestsUrl: string;
  definition: ReportDefinition | null;
};

export type ReportRequestStatus = 'REQUESTED' | 'SAVED' | 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;

export interface ReportRequest {
  id: number;
  uuid: string;
  status: ReportRequestStatus;
  requestDate: string;
  evaluateStartDatetime: string | null;
  evaluateCompleteDatetime: string | null;
  priority: string;
  parameters: Record<string, unknown>;
  requestedBy?: {
    uuid: string;
    display: string;
  };
  report?: {
    uuid: string;
    name: string;
    description: string | null;
  };
  downloadUrls: Partial<Record<DownloadFormats, string>>;
  downloadFormats: Array<DownloadFormats>;
}

export type DownloadFormats = 'pdf' | 'csv' | 'json' | 'excel' | 'adx';

export interface ReportDataSetColumn {
  name: string;
  label: string;
}

export interface ReportDataSet {
  key: string;
  name: string;
  columns: Array<ReportDataSetColumn>;
  rows: Array<Record<string, unknown>>;
  values?: Record<string, unknown>;
}

export interface ReportData {
  request: ReportRequest;
  definition: ReportDefinition;
  parameters: Record<string, unknown>;
  dataSets: Record<string, ReportDataSet>;
}
