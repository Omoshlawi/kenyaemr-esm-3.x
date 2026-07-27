import React, { useCallback, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionItem,
  Button,
  Layer,
  Pagination,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ErrorState,
  formatDate,
  formatDatetime,
  parseDate,
  usePagination,
} from '@openmrs/esm-framework';
import capitalize from 'lodash-es/capitalize';

import { useReportData } from '../../hooks/useReportData';
import { type ReportDataSet } from '../../types';
import ReportDownloadMenu from '../report-download-menu/report-download-menu.component';
import styles from './report-view.scss';
import dayjs from 'dayjs';
import { toTitleCase } from '../utils';

const PAGE_SIZE = 15;
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];

const renderJsonValue = (value: unknown): string => {
  try {
    return JSON.stringify(value) ?? '--';
  } catch {
    return '--';
  }
};

const renderValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const displayValue = record.display ?? record.value ?? record.name;
    return displayValue === undefined || typeof displayValue === 'object'
      ? renderJsonValue(displayValue ?? value)
      : renderValue(displayValue);
  }

  if (typeof value === 'number') {
    const unixConvertedDate = dayjs(value).toDate();
    return formatDate(unixConvertedDate, { noToday: true, time: false });
  }

  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }

  return '--';
};

const RowDataSetTable: React.FC<{ dataSet: ReportDataSet; title: string }> = ({ dataSet, title }) => {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const { results, currentPage, goTo } = usePagination(dataSet.rows ?? [], pageSize);

  const getRowKey = (row: Record<string, unknown>, rowIndex: number) => {
    const rowId = row.id;

    if (typeof rowId === 'string' || typeof rowId === 'number') {
      return String(rowId);
    }

    return `${dataSet.key}-${(currentPage - 1) * pageSize + rowIndex}`;
  };

  const handlePaginationChange = useCallback(
    ({ page, pageSize: newSize }: { page: number; pageSize: number }) => {
      if (newSize !== pageSize) {
        setPageSize(newSize);
        goTo(1);
        return;
      }
      goTo(page);
    },
    [pageSize, goTo],
  );

  if (results?.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyStateTitle}>{toTitleCase(title)}</p>
        <p className={styles.emptyStateSubtitle}>{t('noDataSetData', 'This data set did not return any data.')}</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.tableWrapper}>
        <Table size="xs" useZebraStyles>
          <TableHead>
            <TableRow>
              {dataSet.columns.map((column) => (
                <TableHeader key={column.name}>{capitalize(column.label || column.name)}</TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {results?.map((row, rowIndex) => (
              <TableRow key={getRowKey(row, rowIndex)}>
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
          itemsPerPageText={t('itemsPerPage', 'Items per page:')}
          forwardText={t('nextPage', 'Next page')}
          backwardText={t('previousPage', 'Previous page')}
          itemRangeText={(min, max, total) =>
            t('minMaxItems', '{{min}}-{{max}} of {{total}} items', { min, max, total })
          }
          pageRangeText={(_current, total) => t('pageRangeText', 'of {{count}} pages', { count: total })}
          page={currentPage}
          pageSize={pageSize}
          pageSizes={PAGE_SIZE_OPTIONS}
          totalItems={dataSet.rows.length}
          onChange={handlePaginationChange}
        />
      )}
    </>
  );
};

const IndicatorDataSetTable: React.FC<{ dataSet: ReportDataSet; title: string }> = ({ dataSet, title }) => {
  const { t } = useTranslation();
  const values = dataSet.values ?? {};

  if (Object.keys(values).length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyStateTitle}>{toTitleCase(title)}</p>
        <p className={styles.emptyStateSubtitle}>{t('noIndicatorData', 'This indicator did not return any data.')}</p>
      </div>
    );
  }

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
  const location = useLocation();
  const { reportUuid = '', requestId = '' } = useParams();
  const { reportData, isLoading, error } = useReportData(requestId);
  const [openKeys, setOpenKeys] = useState<Set<string> | null>(null);

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
  const dataSetList = Object.values(dataSets ?? {});

  const dataSetHasData = (dataSet: ReportDataSet) =>
    (dataSet.rows?.length ?? 0) > 0 || Object.keys(dataSet.values ?? {}).length > 0;

  const isIndicatorDataSet = (dataSet: ReportDataSet) =>
    (!dataSet.rows || dataSet.rows.length === 0) && Boolean(dataSet.values);

  const sortedDataSetList = [...dataSetList].sort((a, b) => {
    const aHasData = dataSetHasData(a);
    const bHasData = dataSetHasData(b);
    if (aHasData !== bHasData) {
      return aHasData ? -1 : 1;
    }
    return (a.name || a.key).localeCompare(b.name || b.key);
  });

  const defaultOpenKeys = new Set(sortedDataSetList.slice(0, 1).map((dataSet) => dataSet.key));
  const effectiveOpenKeys = openKeys ?? defaultOpenKeys;
  const allExpanded =
    sortedDataSetList.length > 0 && sortedDataSetList.every((dataSet) => effectiveOpenKeys.has(dataSet.key));
  const hasIndicatorDataSet = sortedDataSetList.some(isIndicatorDataSet);

  const toggleAll = () => {
    setOpenKeys(allExpanded ? new Set() : new Set(sortedDataSetList.map((dataSet) => dataSet.key)));
  };

  const toggleDataSet = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev ?? defaultOpenKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => (location.key === 'default' ? navigate(`/report/${reportUuid}`) : navigate(-1))}>
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

      <div className={styles.dataSets}>
        {dataSetList.length === 0 ? (
          <Layer className={styles.emptyState}>
            <Tile className={styles.emptyStateTile}>
              <p className={styles.emptyStateTitle}>{t('noReportData', 'No report data')}</p>
              <p className={styles.emptyStateSubtitle}>
                {t('noReportDataDescription', 'This report did not return any data.')}
              </p>
            </Tile>
          </Layer>
        ) : (
          <>
            {hasIndicatorDataSet && (
              <div className={styles.dataSetsHeader}>
                <div>
                  <h3 className={styles.dataSetsTitle}>{t('reportSections', 'Report sections')}</h3>
                  <p className={styles.dataSetsHint}>
                    {t(
                      'reportSectionsHint',
                      'Expand a section to view its data. The data is sorted by section with data first.',
                    )}
                  </p>
                </div>
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={toggleAll}
                  renderIcon={allExpanded ? ChevronUpIcon : ChevronDownIcon}>
                  {allExpanded ? t('collapseAll', 'Collapse all') : t('expandAll', 'Expand all')}
                </Button>
              </div>
            )}
            <Accordion className={styles.accordion}>
              {sortedDataSetList.map((dataSet) => {
                const isIndicator = isIndicatorDataSet(dataSet);
                return (
                  <AccordionItem
                    key={dataSet.key}
                    title={toTitleCase(dataSet.name || dataSet.key)}
                    open={effectiveOpenKeys.has(dataSet.key)}
                    onHeadingClick={() => toggleDataSet(dataSet.key)}
                    className={styles.dataSet}>
                    {isIndicator ? (
                      <IndicatorDataSetTable dataSet={dataSet} title={dataSet.name || dataSet.key} />
                    ) : (
                      <RowDataSetTable dataSet={dataSet} title={dataSet.name || dataSet.key} />
                    )}
                  </AccordionItem>
                );
              })}
            </Accordion>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportView;
