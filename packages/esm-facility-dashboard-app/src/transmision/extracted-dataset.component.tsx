import {
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
import React, { useMemo } from 'react';
import { usePipelineExtractedDataset } from './transmission.resources';
import { TransmissionPipeline } from './transmission.type';
import { CardHeader, EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
import { useTranslation } from 'react-i18next';
type ExtractedDatasetProps = {
  pipeline: TransmissionPipeline;
};

const ExtractedDataset: React.FC<ExtractedDatasetProps> = ({ pipeline }) => {
  const { t } = useTranslation();
  const { extractedDatasets, error, isLoading } = usePipelineExtractedDataset(pipeline.slug);
  const extractedRows = useMemo(() => {
    return extractedDatasets.map((ds, i) => ({
      id: `${i}`,
      day: ds.day,
      datasetType: ds.datasetType,
      recordCount: ds.records,
      datasets: ds.datasets,
    }));
  }, [extractedDatasets]);
  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (error) {
    return <ErrorState error={error} headerTitle={t('extractedDataSet', 'Extracted Dataset')} />;
  }

  if (extractedDatasets.length === 0) {
    return (
      <EmptyState
        headerTitle={t('extractedDataSet', 'Extracted Dataset')}
        displayText={t('extractedDataSet', 'Extracted Dataset')}
      />
    );
  }
  return (
    <TableContainer>
      <CardHeader title={t('extractedDataSet', 'Extracted Dataset')}>
        <></>
      </CardHeader>
      <DataTable
        rows={extractedRows}
        headers={[
          { key: 'day', header: t('day', 'Day') },
          { key: 'datasetType', header: t('datasetType', 'Dataset type') },
          { key: 'recordCount', header: t('recordCount', 'Records') },
          { key: 'datasets', header: t('datasets', 'Datasets') },
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

export default ExtractedDataset;
