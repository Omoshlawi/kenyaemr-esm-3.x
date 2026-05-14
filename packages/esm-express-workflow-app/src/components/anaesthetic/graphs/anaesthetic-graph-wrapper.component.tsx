import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Pagination,
} from '@carbon/react';
import { Add, ChartColumn, Table as TableIcon } from '@carbon/react/icons';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import AnaestheticGraph, { AnaestheticGraphData } from './anaesthetic-graph.component';
import { type AnaestheticFormWorkspaceProps } from '../forms/anaesthetic-form.component';
import styles from '../anaesthetic.scss';
import { usePaginationInfo } from '@openmrs/esm-patient-common-lib';

interface AnaestheticGraphWrapperProps {
  data: AnaestheticGraphData[];
  tableData?: Array<{
    pulse: number;
    systolicBP: number;
    diastolicBP: number;
    spo2?: number | string;
    etco2?: number | string;
    date?: string;
    time?: string;
    timestamp?: Date;
  }>;
  viewMode?: 'graph' | 'table';
  currentPage?: number;
  pageSize?: number;
  totalItems?: number;
  controlSize?: 'sm' | 'md' | 'lg';
  onAddData?: () => void;
  onViewModeChange?: (mode: 'graph' | 'table') => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  isAddButtonDisabled?: boolean;
  minTime?: string;
  patient?: {
    uuid: string;
    name: string;
    gender: string;
    age: string;
  };
  onAnaestheticSubmit?: (data: {
    heartRate: number;
    systolicBP: number;
    diastolicBP: number;
    spo2: number;
    etco2: number;
    time: string;
  }) => Promise<void> | void;
}

const AnaestheticGraphWrapper: React.FC<AnaestheticGraphWrapperProps> = ({
  data = [],
  tableData = [],
  viewMode = 'graph',
  currentPage = 1,
  pageSize = 5,
  totalItems = 0,
  controlSize = 'sm',
  onAddData,
  onViewModeChange,
  onPageChange,
  onPageSizeChange,
  isAddButtonDisabled = false,
  minTime,
  patient,
  onAnaestheticSubmit,
}) => {
  const { t } = useTranslation();

  const formatDateTime = (item: any, index: number): string => {
    if (item.timestamp) {
      return (
        item.timestamp.toLocaleDateString() +
        ' ' +
        item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    }

    if (item.date && item.time) {
      return `${item.date} ${item.time}`;
    }

    if (item.date) {
      return item.date;
    }

    if (item.time) {
      return item.time;
    }

    const now = new Date();
    return now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleFormSubmit = async (formData: {
    heartRate: number;
    systolicBP: number;
    diastolicBP: number;
    spo2: number;
    etco2: number;
    time: string;
  }) => {
    await onAnaestheticSubmit?.(formData);
  };

  const [internalPage, setInternalPage] = useState(currentPage);
  const [internalPageSize, setInternalPageSize] = useState(pageSize);
  React.useEffect(() => {
    setInternalPage(currentPage);
  }, [currentPage]);
  React.useEffect(() => {
    setInternalPageSize(pageSize);
  }, [pageSize]);

  const { pageSizes: calculatedPageSizes, itemsDisplayed } = usePaginationInfo(
    internalPageSize,
    Math.ceil((totalItems || 0) / internalPageSize),
    internalPage,
    totalItems || 0,
  );

  const paginatedTableData = tableData.slice((internalPage - 1) * internalPageSize, internalPage * internalPageSize);
  const existingTimeEntries = tableData
    .filter((item) => typeof item.time === 'string' && item.time.includes(':'))
    .map((item, index) => ({ hour: index, time: item.time as string }));

  const handleAddData = () => {
    onAddData?.();
    launchWorkspace2<AnaestheticFormWorkspaceProps, {}, {}>('anaesthetic-record-workspace-form', {
      onSubmit: handleFormSubmit,
      patient,
      existingTimeEntries,
      minTime,
    });
  };

  const headers = [
    { key: 'dateTime', header: t('dateTime', 'Date & Time') },
    { key: 'heartRate', header: t('heartRate', 'Heart Rate (bpm)') },
    { key: 'bloodPressure', header: t('bloodPressure', 'Blood Pressure (mmHg)') },
    { key: 'spo2', header: t('spo2', 'SPO2') },
    { key: 'etco2', header: t('etco2', 'EtCO2') },
  ];

  const rows = paginatedTableData.map((item, index) => {
    return {
      id: `${internalPage}-${index}`,
      dateTime: formatDateTime(item, index),
      heartRate: item.pulse,
      bloodPressure: `${item.systolicBP}/${item.diastolicBP}`,
      spo2: item.spo2 ?? '--',
      etco2: item.etco2 ?? '--',
    };
  });

  return (
    <div className={styles.fetalHeartRateSection}>
      <div className={styles.fetalHeartRateContainer}>
        <div className={styles.fetalHeartRateHeader}>
          <div className={styles.fetalHeartRateTitle}>
            <h3 className={styles.fetalHeartRateHeading}>{t('anaestheticRecord', 'Anaesthetic record')}</h3>
          </div>
          <div className={styles.fetalHeartRateControls}>
            <div className={styles.viewToggle}>
              <Button
                kind={viewMode === 'graph' ? 'primary' : 'secondary'}
                size={controlSize}
                hasIconOnly
                iconDescription={t('graphView', 'Graph View')}
                onClick={() => onViewModeChange?.('graph')}
                className={styles.viewButton}>
                <ChartColumn />
              </Button>
              <Button
                kind={viewMode === 'table' ? 'primary' : 'secondary'}
                size={controlSize}
                hasIconOnly
                iconDescription={t('tableView', 'Table View')}
                onClick={() => onViewModeChange?.('table')}
                className={styles.viewButton}>
                <TableIcon />
              </Button>
            </div>
            <Button
              kind="primary"
              size={controlSize}
              renderIcon={Add}
              iconDescription="Add anaesthetic record"
              disabled={isAddButtonDisabled}
              onClick={handleAddData}
              className={styles.addButton}>
              Add
            </Button>
          </div>
        </div>

        {viewMode === 'graph' ? (
          <AnaestheticGraph data={data} />
        ) : (
          <div className={styles.tableContainer}>
            {tableData && tableData.length > 0 ? (
              <>
                <TableContainer title="">
                  <DataTable rows={rows} headers={headers} isSortable={false}>
                    {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                      <Table {...getTableProps()} size={controlSize} className={styles.dataTable}>
                        <TableHead>
                          <TableRow>
                            {headers.map((header) => (
                              <TableHeader {...getHeaderProps({ header })} key={header.key}>
                                {header.header}
                              </TableHeader>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.map((row) => (
                            <TableRow {...getRowProps({ row })} key={row.id}>
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
                <Pagination
                  page={internalPage}
                  pageSize={internalPageSize}
                  pageSizes={calculatedPageSizes}
                  totalItems={totalItems}
                  onChange={({ page, pageSize }) => {
                    setInternalPage(page);
                    setInternalPageSize(pageSize);
                    onPageChange?.(page);
                    onPageSizeChange?.(pageSize);
                  }}
                  className={styles.pagination}
                />
                {totalItems > 0 && <div className={styles.paginationInfo}>{itemsDisplayed}</div>}
              </>
            ) : (
              <div className={styles.emptyTable}>
                <p>{t('noAnaestheticRecordData', 'No anaesthetic record data available')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnaestheticGraphWrapper;
