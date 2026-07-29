import React, { useMemo } from 'react';
import { TransmissionPipeline } from './transmission.type';
import { useTranslation } from 'react-i18next';
import { usePipelinePushedDataset } from './transmission.resources';
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
import { CardHeader, EmptyState, ErrorState } from '@openmrs/esm-patient-common-lib';
type PushedDatasetProps = {
  pipeline: TransmissionPipeline;
};
const PushedDataset: React.FC<PushedDatasetProps> = ({ pipeline }) => {
  const { t } = useTranslation();
  const { pushedDatasets, error, isLoading } = usePipelinePushedDataset(pipeline.slug);
  const pushedRows = useMemo(() => {
    return pushedDatasets.map((ds, i) => ({
      id: `${i}`,
      day: ds.day,
      datasetType: ds.datasetType,
      recordCount: ds.records,
      datasets: ds.datasets,
    }));
  }, [pushedDatasets]);
  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (error) {
    return <ErrorState error={error} headerTitle={t('pushedDataset', 'Pushed Dataset')} />;
  }
  if (pushedDatasets.length === 0) {
    return (
      <EmptyState
        headerTitle={t('pushedDataset', 'Pushed Dataset')}
        displayText={t('pushedDataset', 'Pushed Dataset')}
      />
    );
  }
  return (
    <TableContainer>
      <CardHeader title={t('pushedDataset', 'Pushed Dataset')}>
        <></>
      </CardHeader>
      <DataTable
        rows={pushedRows}
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

export default PushedDataset;
