import React, { useCallback, useMemo, useState } from 'react';
import {
  DataTable,
  OverflowMenu,
  OverflowMenuItem,
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
  type DataTableHeader,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  EmptyCard,
  ErrorCard,
  formatDatetime,
  parseDate,
  useDebounce,
  usePagination,
  usePaginationInfo,
} from '@openmrs/esm-framework';

import { useReportRequests } from '../../hooks/useReportRequests';
import { type ReportRequest } from '../../types';
import styles from './report-history-dashboard.scss';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const COMPLETED = 'COMPLETED';
const FAILED = 'FAILED';
/**
 * t('COMPLETED', 'COMPLETED')
 * t('FAILED', 'FAILED')
 * t('PROCESSING', 'PROCESSING')
 * t('SCHEDULED', 'SCHEDULED')
 * t('REQUESTED', 'REQUESTED')
 * t('OTHER', 'OTHER')
 */
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

const ReportHistoryDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { requests, isLoading, error } = useReportRequests();

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => parseDate(b.requestDate).getTime() - parseDate(a.requestDate).getTime()),
    [requests],
  );

  const filteredRequests = useMemo(() => {
    if (!debouncedSearchTerm) {
      return sortedRequests;
    }
    const term = debouncedSearchTerm.toLowerCase();
    return sortedRequests.filter((request) =>
      [request.report?.name, request.requestedBy?.display, request.status, request.requestDate]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [sortedRequests, debouncedSearchTerm]);

  const { results, currentPage, goTo } = usePagination(filteredRequests, pageSize);
  const { pageSizes } = usePaginationInfo(DEFAULT_PAGE_SIZE, filteredRequests.length, currentPage, results.length);

  const headers: Array<DataTableHeader> = useMemo(
    () => [
      { key: 'report', header: t('report', 'Report') },
      { key: 'requestDate', header: t('requestedDateTime', 'Requested Date & Time') },
      { key: 'requestedBy', header: t('requestedBy', 'Requested By') },
      { key: 'status', header: t('status', 'Status') },
      { key: 'timeTaken', header: t('timeTaken', 'Time Taken') },
    ],
    [t],
  );

  const tableRows = useMemo(
    () =>
      results.map((request) => ({
        id: String(request.id),
        report: request.report?.name ?? '--',
        requestDate: formatDatetime(parseDate(request.requestDate), { mode: 'standard', noToday: true }),
        requestedBy: request.requestedBy?.display ?? t('selfServicePortal', 'Self-Service Portal'),
        status: request.status,
        timeTaken: formatDuration(durationMs(request)),
      })),
    [results, t],
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement> | '', value?: string) => {
      const searchValue = typeof event === 'string' ? value ?? '' : event.target.value;
      setSearchTerm(searchValue);
      if (currentPage !== 1) {
        goTo(1);
      }
    },
    [currentPage, goTo],
  );

  const handlePaginationChange = useCallback(
    ({ page, pageSize: newSize }: { page: number; pageSize: number }) => {
      if (newSize !== pageSize) {
        setPageSize(newSize);
      }
      goTo(page);
    },
    [pageSize, goTo],
  );

  if (isLoading) {
    return (
      <div className={styles.reportHistoryDashboard}>
        <SkeletonText heading width="40%" />
        <SkeletonText paragraph lineCount={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.reportHistoryDashboard}>
        <ErrorCard error={error} headerTitle={t('reportHistoryDashboard', 'Report History Dashboard')} />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className={styles.reportHistoryDashboard}>
        <EmptyCard
          headerTitle={t('noReportHistory', 'No report history')}
          displayText={t('noReportHistoryDescription', 'No report history found')}
        />
      </div>
    );
  }

  return (
    <div className={styles.reportHistoryDashboard}>
      <DataTable size="sm" rows={tableRows} headers={headers} isSortable useZebraStyles>
        {({ rows, headers, getHeaderProps, getRowProps, getToolbarProps, getTableProps, getTableContainerProps }) => (
          <TableContainer
            title={t('reportHistory', 'Report History')}
            description={t('reportHistoryDescription', 'A list of all report requests across every report.')}
            {...getTableContainerProps()}>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <TableToolbarSearch
                  persistent
                  onChange={handleSearchChange}
                  placeholder={t('searchReportHistory', 'Search by report, user, or status')}
                />
              </TableToolbarContent>
            </TableToolbar>

            <Table {...getTableProps()} aria-label={t('reportHistory', 'Report History')}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                  ))}
                  <TableHeader aria-label={t('rowActions', 'Row actions')} />
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row, index) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map((cell) => {
                      if (cell.info.header === 'status') {
                        return (
                          <TableCell key={cell.id}>
                            <Tag size="sm" type={statusTagType(String(cell.value))}>
                              {t(cell.value, String(cell.value))}
                            </Tag>
                          </TableCell>
                        );
                      }
                      return <TableCell key={cell.id}>{cell.value}</TableCell>;
                    })}
                    <TableCell className="cds--table-column-menu">
                      <OverflowMenu size="sm" flipped aria-label={t('rowActions', 'Row actions')}>
                        <OverflowMenuItem
                          disabled={results[index]?.status !== 'COMPLETED'}
                          onClick={() => {
                            const request = results[index];
                            navigate(`/report/${request.report?.uuid}/requests/${request.id}`);
                          }}
                          itemText={t('viewResults', 'View results')}
                        />
                        <OverflowMenuItem
                          onClick={() => navigate(`/report/${results[index].report?.uuid}`)}
                          itemText={t('viewHistory', 'View history')}
                        />
                      </OverflowMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <Pagination
        itemsPerPageText={t('itemsPerPage', 'Items per page:')}
        forwardText={t('nextPage', 'Next page')}
        backwardText={t('previousPage', 'Previous page')}
        itemRangeText={(min, max, total) => t('minMaxItems', '{{min}}-{{max}} of {{total}} items', { min, max, total })}
        pageRangeText={(_current, total) => t('pageRangeText', 'of {{count}} pages', { count: total })}
        page={currentPage}
        pageSize={pageSize}
        pageSizes={pageSizes?.length > 0 ? pageSizes : PAGE_SIZE_OPTIONS}
        totalItems={filteredRequests.length}
        onChange={handlePaginationChange}
      />
    </div>
  );
};

export default ReportHistoryDashboard;
