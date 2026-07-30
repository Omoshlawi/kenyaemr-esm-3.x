import {
  Button,
  DataTable,
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { CardHeader, EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePipelineFailedDataset } from './transmission.resources';
import { FailedDataset, TransmissionPipeline } from './transmission.type';
import { View } from '@carbon/react/icons';
import { formatDatetime, parseDate, showModal } from '@openmrs/esm-framework';
type FailedDatasetProps = {
  pipeline: TransmissionPipeline;
};
const FailedDataset: React.FC<FailedDatasetProps> = ({ pipeline }) => {
  const { t } = useTranslation();
  const { failedDatasets, error, isLoading } = usePipelineFailedDataset(pipeline.slug);
  const handleViewPaylod = useCallback(
    (failedDataset: FailedDataset) => {
      const dismiss = showModal('transmission-queue-payload-modal', {
        onClose: () => dismiss(),
        failedDataset,
        pipeline,
      });
    },
    [pipeline],
  );
  const failedRows = useMemo(() => {
    return failedDatasets.map((ds, i) => ({
      id: `${i}`,
      queueId: ds.queueId,
      datasetType: ds.datasetType,
      extractedAt: ds.extractedAt ? formatDatetime(parseDate(ds.extractedAt)) : '--',
      fetchDate: ds.fetchDate ? formatDatetime(parseDate(ds.fetchDate)) : '--',
      lastAttemptTime: ds.lastAttemptTime ? formatDatetime(parseDate(ds.lastAttemptTime)) : '--',
      lastError: ds.lastError,
      nextAttemptTime: ds.nextAttemptTime ? formatDatetime(parseDate(ds.nextAttemptTime)) : '--',
      recordCount: ds.recordCount,
      retryCount: ds.retryCount,
      status: ds.status,
      batchUuid1: ds.batchUuid,
      actions: (
        <Button
          hasIconOnly
          renderIcon={View}
          onClick={() => handleViewPaylod(ds)}
          kind="ghost"
          iconDescription={t('view', 'View')}
        />
      ),
    }));
  }, [failedDatasets, handleViewPaylod, t]);
  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (error) {
    return <ErrorState error={error} headerTitle={t('failedDataSet', 'Failed Dataset')} />;
  }

  if (failedDatasets.length === 0) {
    return (
      <EmptyState
        headerTitle={t('failedDataSet', 'Failed Dataset')}
        displayText={t('failedDataSet', 'Failed Dataset')}
      />
    );
  }

  return (
    <TableContainer>
      <CardHeader title={t('failedDataSet', 'Failed Dataset')}>
        <></>
      </CardHeader>
      <DataTable
        rows={failedRows}
        headers={[
          { key: 'queueId', header: t('queueId', 'Queue ID') },
          { key: 'extractedAt', header: t('extractedAt', 'Extracted at') },
          { key: 'fetchDate', header: t('fetchDate', 'Fetch Date') },
          { key: 'lastAttemptTime', header: t('lastAttemptTime', 'Last attempt time') },
          { key: 'datasetType', header: t('datasetType', 'Dataset type') },
          { key: 'lastError', header: t('lastError', 'Last error') },
          { key: 'nextAttemptTime', header: t('nextAttempt', 'Next attempt') },
          { key: 'recordCount', header: t('recordCount', 'Records') },
          { key: 'retryCount', header: t('retryCount', 'Retry count') },
          { key: 'status', header: t('status', 'Status') },
          { key: 'actions', header: t('actions', 'Actions') },
        ]}>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
          <Table {...getTableProps()} size="sm">
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow {...getRowProps({ row })}>
                  {row.cells.map((cell) => (
                    <TableCell key={cell.id}>{cell.value}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
    </TableContainer>
  );
};

export default FailedDataset;
