import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  InlineNotification,
  Pagination,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Tag,
  Tile,
  type DataTableHeader,
} from '@carbon/react';
import { ArrowLeft, Play, View } from '@carbon/react/icons';
import '@carbon/charts/styles.css';
import {
  ErrorState,
  formatDatetime,
  launchWorkspace2,
  parseDate,
  useDebounce,
  usePagination,
} from '@openmrs/esm-framework';

import { useReportDefinition } from '../../hooks/useReportDefinition';
import { useReportRequestsByReportUuid } from '../../hooks/useReportRequests';
import { type ReportRequest } from '../../types';
import ReportDownloadMenu from '../report-download-menu/report-download-menu.component';
import styles from './report-history.scss';

const PAGE_SIZE = 10;
const COMPLETED = 'COMPLETED';
const FAILED = 'FAILED';

const statusTagType = (status: string): 'green' | 'blue' | 'red' | 'gray' => {
  switch (status) {
    case COMPLETED:
      return 'green';
    case FAILED:
      return 'red';
    case 'PROCESSING':
    case 'SCHEDULED':
    case 'REQUESTED':
      return 'blue';
    default:
      return 'gray';
  }
};

const durationMs = (request: ReportRequest): number | null => {
  if (!request.evaluateStartDatetime || !request.evaluateCompleteDatetime) {
    return null;
  }
  return parseDate(request.evaluateCompleteDatetime).getTime() - parseDate(request.evaluateStartDatetime).getTime();
};

const formatDuration = (ms: number | null): string => {
  if (ms === null) {
    return '--';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = `${Math.floor(totalSeconds / 3600)}`.padStart(2, '0');
  const minutes = `${Math.floor((totalSeconds % 3600) / 60)}`.padStart(2, '0');
  const seconds = `${totalSeconds % 60}`.padStart(2, '0');
  const hundredths = `${Math.floor((ms % 1000) / 10)}`.padStart(2, '0');
  return `${hours}:${minutes}:${seconds}.${hundredths}`;
};

const ReportHistory: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { reportUuid = '' } = useParams();

  const { report, isLoading: isLoadingReport, error: reportError } = useReportDefinition(reportUuid);
  const {
    requests,
    isLoading: isLoadingRequests,
    error: requestsError,
    mutate: mutateRequests,
  } = useReportRequestsByReportUuid(reportUuid);

  const [searchTerm, setSearchTerm] = React.useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => parseDate(b.requestDate).getTime() - parseDate(a.requestDate).getTime()),
    [requests],
  );

  const metrics = useMemo(() => {
    const total = sortedRequests.length;
    const completed = sortedRequests.filter((request) => request.status === COMPLETED);
    const failed = sortedRequests.filter((request) => request.status === FAILED);
    const durations = sortedRequests.map(durationMs).filter((value): value is number => value !== null);
    const avgMs = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null;
    const successRate = total ? (completed.length / total) * 100 : 0;

    return {
      total,
      completed: completed.length,
      failed: failed.length,
      pending: total - completed.length - failed.length,
      successRate,
      avgSeconds: avgMs !== null ? avgMs / 1000 : null,
      lastRunBy: sortedRequests[0]?.requestedBy?.display ?? '--',
    };
  }, [sortedRequests]);

  const filteredRequests = useMemo(() => {
    if (!debouncedSearchTerm) {
      return sortedRequests;
    }
    const term = debouncedSearchTerm.toLowerCase();
    return sortedRequests.filter((request) =>
      [request.requestedBy?.display, request.status, request.requestDate]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [sortedRequests, debouncedSearchTerm]);

  const { results, currentPage, goTo } = usePagination(filteredRequests, PAGE_SIZE);

  const headers: Array<DataTableHeader> = useMemo(
    () => [
      { key: 'requestDate', header: t('requestedDateTime', 'Requested Date & Time') },
      { key: 'requestedBy', header: t('requestedBy', 'Requested By') },
      { key: 'status', header: t('status', 'Status') },
      { key: 'timeTaken', header: t('timeTaken', 'Time Taken') },
    ],
    [t],
  );

  const rows = useMemo(
    () =>
      results.map((request) => ({
        id: String(request.id),
        requestDate: formatDatetime(parseDate(request.requestDate), { mode: 'standard' }),
        requestedBy: request.requestedBy?.display ?? t('selfServicePortal', 'Self-Service Portal'),
        status: request.status,
        timeTaken: formatDuration(durationMs(request)),
      })),
    [results, t],
  );

  const handleRunReport = () => {
    launchWorkspace2('report-request-workspace', { reportUuid, mutateRequests: mutateRequests, navigate });
  };

  if (isLoadingReport || isLoadingRequests) {
    return (
      <div className={styles.loadingState}>
        <SkeletonText heading width="40%" />
        <SkeletonText paragraph lineCount={3} />
      </div>
    );
  }

  if (reportError || requestsError) {
    return (
      <div className={styles.errorState}>
        <ErrorState error={reportError ?? requestsError} headerTitle={t('reportHistory', 'Report History')} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => (location.key === 'default' ? navigate('/') : navigate(-1))}>
          <ArrowLeft size={16} />
          {t('backToAllReports', 'Back to all reports')}
        </button>
        <span>/</span>
        <span>{t('reportHistory', 'Report History')}</span>
      </div>

      <div className={styles.titleRow}>
        <div className={styles.titleGroup}>
          <div className={styles.titleLine}>
            <h2 className={styles.title}>{report?.name}</h2>
            {report?.type && <Tag type="blue">{t('reportType', 'Report')}</Tag>}
          </div>
          {report?.description && <p className={styles.description}>{report.description}</p>}
        </div>
        <Button kind="primary" renderIcon={Play} onClick={handleRunReport}>
          {t('runReportNow', 'Run Report Now')}
        </Button>
      </div>

      <div className={styles.tiles}>
        <Tile className={styles.tile}>
          <p className={styles.tileLabel}>{t('totalRuns', 'Total Runs')}</p>
          <div className={styles.tileValueRow}>
            <span className={styles.tileValue}>{metrics.total}</span>
          </div>
        </Tile>
        <Tile className={styles.tile}>
          <p className={styles.tileLabel}>{t('successRate', 'Success Rate')}</p>
          <div className={styles.tileValueRow}>
            <span className={styles.tileValue}>{metrics.successRate.toFixed(1)}%</span>
          </div>
        </Tile>
        <Tile className={styles.tile}>
          <p className={styles.tileLabel}>{t('avgGenerationTime', 'Avg. Generation Time')}</p>
          <div className={styles.tileValueRow}>
            <span className={styles.tileValue}>
              {metrics.avgSeconds !== null ? `${metrics.avgSeconds.toFixed(2)}s` : '--'}
            </span>
          </div>
        </Tile>
        <Tile className={styles.tile}>
          <p className={styles.tileLabel}>{t('lastRunBy', 'Last Run By')}</p>
          <div className={styles.lastRunBy}>
            <span className={styles.tileValue} style={{ fontSize: '1rem' }}>
              {metrics.lastRunBy}
            </span>
          </div>
        </Tile>
      </div>

      <div className={styles.tableSection}>
        <DataTable size="sm" rows={rows} headers={headers} isSortable useZebraStyles>
          {({
            rows: tableRows,
            headers: tableHeaders,
            getHeaderProps,
            getRowProps,
            getTableProps,
            getToolbarProps,
          }) => (
            <TableContainer
              title={t('reportExecutionHistory', 'Report Execution History')}
              description={t('reportExecutionHistoryDescription', 'A list of all the runs of this report.')}>
              <TableToolbar {...getToolbarProps()}>
                <TableToolbarContent>
                  <TableToolbarSearch
                    persistent
                    placeholder={t('searchHistory', 'Search history')}
                    onChange={(event: React.ChangeEvent<HTMLInputElement> | '', value?: string) => {
                      setSearchTerm(typeof event === 'string' ? value ?? '' : event.target.value);
                      goTo(1);
                    }}
                  />
                </TableToolbarContent>
              </TableToolbar>
              <Table {...getTableProps()} aria-label={t('reportExecutionHistory', 'Report Execution History')}>
                <TableHead>
                  <TableRow>
                    {tableHeaders.map((header) => (
                      <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                    ))}
                    <TableHeader aria-label={t('actions', 'Actions')} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map((row, index) => {
                    const request = results[index];
                    const isCompleted = request?.status === COMPLETED;
                    return (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell) => {
                          if (cell.info.header === 'status') {
                            return (
                              <TableCell key={cell.id}>
                                <Tag type={statusTagType(cell.value)} size="sm">
                                  {cell.value}
                                </Tag>
                              </TableCell>
                            );
                          }
                          if (cell.info.header === 'timeTaken' && !isCompleted) {
                            return (
                              <TableCell key={cell.id}>
                                <span className={styles.mutedText}>{t('processing', 'Processing...')}</span>
                              </TableCell>
                            );
                          }
                          return <TableCell key={cell.id}>{cell.value}</TableCell>;
                        })}
                        <TableCell>
                          <div className={styles.actionsCell}>
                            {isCompleted ? (
                              <>
                                <button
                                  type="button"
                                  className={styles.actionLink}
                                  onClick={() => navigate(`/report/${reportUuid}/requests/${request.id}`)}>
                                  <View size={16} /> {t('view', 'View')}
                                </button>
                                <ReportDownloadMenu request={request} reportName={report?.name} />
                              </>
                            ) : (
                              <span className={styles.mutedText}>{t('availableSoon', 'Available soon')}</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
        {filteredRequests.length === 0 ? (
          <InlineNotification
            lowContrast
            kind="info"
            title={t('noRuns', 'No runs yet')}
            subtitle={t('noRunsSubtitle', 'This report has not been requested yet.')}
          />
        ) : (
          <Pagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            pageSizes={[PAGE_SIZE]}
            totalItems={filteredRequests.length}
            itemRangeText={(min, max, total) =>
              t('showingRuns', 'Showing {{min}} to {{max}} of {{total}} runs', { min, max, total })
            }
            onChange={({ page }) => goTo(page)}
          />
        )}
      </div>
    </div>
  );
};

export default ReportHistory;
