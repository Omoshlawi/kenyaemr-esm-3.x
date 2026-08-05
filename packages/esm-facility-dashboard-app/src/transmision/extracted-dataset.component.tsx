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
import { CardHeader, ErrorState } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@openmrs/esm-patient-common-lib';
type ExtractedDatasetProps = {
  pipeline: TransmissionPipeline;
};

const ExtractedDataset: React.FC<ExtractedDatasetProps> = ({ pipeline }) => {
  const { t } = useTranslation();
  const { extractedDatasets, error, isLoading } = usePipelineExtractedDataset(pipeline.slug);
  const headers = [
    { key: 'day', header: t('day', 'Day') },
    { key: 'datasetType', header: t('datasetType', 'Dataset type') },
    { key: 'recordCount', header: t('recordCount', 'Records') },
    { key: 'datasets', header: t('datasets', 'Datasets') },
  ];
  const title = t('extractedDataSet', 'Extracted Dataset');
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
    return <ErrorState error={error} headerTitle={title} />;
  }

  if (extractedDatasets.length === 0) {
    return <EmptyState headerTitle={title} displayText={title} />;
  }
  return (
    <TableContainer>
      <CardHeader title={t('extractedDataSet', 'Extracted Dataset')}>
        <></>
      </CardHeader>
      <DataTable rows={extractedRows} headers={headers}>
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
