import dayjs from 'dayjs';
import React, { type ReactElement } from 'react';
import { Csv, DocumentPdf, Json, Xls, Xml, type CarbonIconType } from '@carbon/react/icons';
import { openmrsFetch } from '@openmrs/esm-framework';
import type { DownloadFormats } from '../types';

const UNIX_TIMESTAMP_SECONDS_PATTERN = /^\d{10}$/;

export const isUnixTimestampString = (value: string): boolean => {
  const trimmedValue = value.trim();
  const timestamp = Number(trimmedValue);

  return (
    UNIX_TIMESTAMP_SECONDS_PATTERN.test(trimmedValue) &&
    Number.isSafeInteger(timestamp) &&
    dayjs.unix(timestamp).isValid()
  );
};

const downloadFormatIconMap = {
  pdf: DocumentPdf,
  csv: Csv,
  excel: Xls,
  json: Json,
  adx: Xml,
} as const satisfies Record<DownloadFormats, CarbonIconType>;

export const getDownloadFormatIcon = (downloadFormat: DownloadFormats, size = 20): ReactElement => {
  const Icon = downloadFormatIconMap[downloadFormat];
  return <Icon size={size} />;
};

export const downloadFormatLabel: Record<DownloadFormats, string> = {
  pdf: 'PDF',
  csv: 'CSV',
  excel: 'Excel',
  json: 'JSON',
  adx: 'ADX',
};

const parseFilename = (contentDisposition: string | null): string | null => {
  if (!contentDisposition) {
    return null;
  }
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Fetches a completed report request export and triggers a browser download.
 * The backend serves the file as an attachment, so the response body is read as a
 * blob rather than parsed as JSON.
 */
export const downloadReportRequestFile = async (downloadUrl: string, fallbackFilename: string): Promise<void> => {
  const response = await openmrsFetch(downloadUrl, { headers: { Accept: '*/*' } });
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = parseFilename(response.headers?.get('content-disposition')) ?? fallbackFilename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};
