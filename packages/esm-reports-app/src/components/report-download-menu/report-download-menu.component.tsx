import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { Download } from '@carbon/react/icons';
import { showSnackbar } from '@openmrs/esm-framework';
import { type ReportRequest } from '../../types';
import { downloadFormatLabel, downloadReportRequestFile } from '../utils';

interface ReportDownloadMenuProps {
  request: Pick<ReportRequest, 'id' | 'downloadFormats' | 'downloadUrls'>;
  reportName?: string;
  flipped?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ReportDownloadMenu: React.FC<ReportDownloadMenuProps> = ({
  request,
  reportName,
  flipped = true,
  size = 'sm',
}) => {
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);

  const formats = (request.downloadFormats ?? []).filter((format) => Boolean(request.downloadUrls?.[format]));

  if (formats.length === 0) {
    return null;
  }

  const handleDownload = async (format: (typeof formats)[number]) => {
    const downloadUrl = request.downloadUrls?.[format];
    if (!downloadUrl || isDownloading) {
      return;
    }
    setIsDownloading(true);
    const fallbackFilename = `${reportName ?? 'report'}-${request.id}.${format}`;
    try {
      await downloadReportRequestFile(downloadUrl, fallbackFilename);
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: t('downloadFailed', 'Download failed'),
        subtitle:
          error instanceof Error ? error.message : t('downloadFailedSubtitle', 'Unable to download the report file.'),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <OverflowMenu
      flipped={flipped}
      size={size}
      renderIcon={Download}
      iconDescription={t('download', 'Download')}
      aria-label={t('downloadReport', 'Download report')}>
      {formats.map((format) => (
        <OverflowMenuItem
          key={format}
          disabled={isDownloading}
          onClick={() => handleDownload(format)}
          itemText={t('downloadAs', 'Download as {{format}}', { format: downloadFormatLabel[format] })}
        />
      ))}
    </OverflowMenu>
  );
};

export default ReportDownloadMenu;
