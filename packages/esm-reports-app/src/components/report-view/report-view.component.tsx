import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pagination, SkeletonText, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@carbon/react';
import { ErrorState, formatDate, formatDatetime, parseDate } from '@openmrs/esm-framework';

import { useReportData } from '../../hooks/useReportData';
import { type ReportDataSet } from '../../types';
import ReportDownloadMenu from '../report-download-menu/report-download-menu.component';
import styles from './report-view.scss';
import dayjs from 'dayjs';

const PAGE_SIZE = 20;

const renderValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return String(record.display ?? record.value ?? record.name ?? JSON.stringify(value));
  }

  if (typeof value === 'number') {
    const unixConvertedDate = dayjs(value).toDate();
    return formatDate(unixConvertedDate, { noToday: true, time: false });
  }

  return String(value);
};

const RowDataSetTable: React.FC<{ dataSet: ReportDataSet }> = ({ dataSet }) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const pagedRows = useMemo(
    () => dataSet.rows.slice((page - 1) * pageSize, page * pageSize),
    [dataSet.rows, page, pageSize],
  );

  return (
    <>
      <div className={styles.tableWrapper}>
        <Table size="sm" useZebraStyles>
          <TableHead>
            <TableRow>
              {dataSet.columns.map((column) => (
                <TableHeader key={column.name}>{column.label || column.name}</TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {dataSet.columns.map((column) => (
                  <TableCell key={column.name}>{renderValue(row[column.name])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {dataSet.rows.length > PAGE_SIZE && (
        <Pagination
          page={page}
          pageSize={pageSize}
          pageSizes={[20, 50, 100]}
          totalItems={dataSet.rows.length}
          itemRangeText={(min, max, total) =>
            t('minMaxItems', '{{min}}-{{max}} of {{total}} items', { min, max, total })
          }
          onChange={({ page: newPage, pageSize: newPageSize }) => {
            setPage(newPage);
            setPageSize(newPageSize);
          }}
        />
      )}
    </>
  );
};

const IndicatorDataSetTable: React.FC<{ dataSet: ReportDataSet }> = ({ dataSet }) => {
  const { t } = useTranslation();
  const values = dataSet.values ?? {};

  return (
    <div className={`${styles.tableWrapper} ${styles.indicatorTable}`}>
      <Table size="sm" useZebraStyles>
        <TableHead>
          <TableRow>
            <TableHeader>{t('indicator', 'Indicator')}</TableHeader>
            <TableHeader>{t('value', 'Value')}</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {dataSet.columns.map((column) => (
            <TableRow key={column.name}>
              <TableCell>{column.label || column.name}</TableCell>
              <TableCell>{renderValue(values[column.name])}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const ReportView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reportUuid = '', requestId = '' } = useParams();
  const { reportData, isLoading, error } = useReportData(requestId);

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <SkeletonText heading width="40%" />
        <SkeletonText paragraph lineCount={5} />
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className={styles.errorState}>
        <ErrorState error={error} headerTitle={t('reportData', 'Report data')} />
      </div>
    );
  }

  const { request, definition, parameters, dataSets } = reportData;

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <button type="button" className={styles.backButton} onClick={() => navigate(`/report/${reportUuid}`)}>
          {t('reportsHistory', 'Report History')}
        </button>
        <span>/</span>
        <span>{t('reportData', 'Report data')}</span>
      </div>

      <div className={styles.titleRow}>
        <div>
          <h2 className={styles.title}>{definition?.name}</h2>
          {request?.requestDate && (
            <p className={styles.subtitle}>
              {t('generatedOn', 'Generated on {{date}}', {
                date: formatDatetime(parseDate(request.requestDate), { mode: 'standard', noToday: true }),
              })}
              {request?.requestedBy?.display ? ` · ${request.requestedBy.display}` : ''}
            </p>
          )}
        </div>
        {request && <ReportDownloadMenu request={request} reportName={definition?.name} />}
      </div>

      {parameters && Object.keys(parameters).length > 0 && (
        <div className={styles.parameters}>
          {Object.entries(parameters).map(([name, value]) => (
            <div key={name} className={styles.parameter}>
              <span className={styles.parameterLabel}>{name}</span>
              <span className={styles.parameterValue}>{renderValue(value)}</span>
            </div>
          ))}
        </div>
      )}

      {Object.values(dataSets ?? {}).map((dataSet) => {
        const isIndicator = (!dataSet.rows || dataSet.rows.length === 0) && dataSet.values;
        return (
          <div key={dataSet.key} className={styles.dataSet}>
            <h3 className={styles.dataSetTitle}>{dataSet.name || dataSet.key}</h3>
            {isIndicator ? <IndicatorDataSetTable dataSet={dataSet} /> : <RowDataSetTable dataSet={dataSet} />}
          </div>
        );
      })}
    </div>
  );
};

export default ReportView;
