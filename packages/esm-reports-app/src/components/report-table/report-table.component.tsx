import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  DataTable,
  TableContainer,
  OverflowMenu,
  OverflowMenuItem,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Tag,
  Pagination,
} from '@carbon/react';

import styles from './report-table.scss';
import { usePaginationInfo, usePagination, useDebounce, launchWorkspace2 } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

const DEFAULT_PAGE_SIZE = 15;

type ReportTableProps = {
  tableRows: Array<any>;
  tableHeaders: Array<any>;
  tableTitle: string;
  tableDescription: string;
  filters?: React.ReactNode;
};

const ReportTable: React.FC<ReportTableProps> = ({
  tableRows,
  tableHeaders,
  tableTitle,
  tableDescription,
  filters,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { t } = useTranslation();

  useEffect(() => {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        if (debouncedSearchTerm) {
          next.set('q', debouncedSearchTerm);
        } else {
          next.delete('q');
        }
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearchTerm, setSearchParams]);
  const filteredRows = tableRows.filter((row) =>
    Object.values(row).some((value) => {
      if (value === null || value === undefined) {
        return false;
      }
      const searchableValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return searchableValue.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    }),
  );
  const { results, currentPage, goTo } = usePagination(filteredRows ?? [], pageSize);
  const { pageSizes } = usePaginationInfo(DEFAULT_PAGE_SIZE, filteredRows.length, currentPage, filteredRows.length);

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

  const handleRequestReport = useCallback((report: Record<string, unknown>) => {
    launchWorkspace2('report-request-workspace', { reportUuid: report.id, navigate });
  }, []);

  return (
    <div className={styles.container}>
      <DataTable size="sm" rows={results} headers={tableHeaders} isSortable useZebraStyles>
        {({
          rows,
          headers,
          getHeaderProps,
          getRowProps,
          getBatchActionProps,
          getToolbarProps,
          getTableProps,
          getTableContainerProps,
        }) => {
          const batchActionProps = getBatchActionProps();

          return (
            <TableContainer title={tableTitle} description={tableDescription} {...getTableContainerProps()}>
              <TableToolbar {...getToolbarProps()}>
                <TableToolbarContent aria-hidden={batchActionProps.shouldShowBatchActions}>
                  <TableToolbarSearch
                    persistent
                    value={searchTerm}
                    placeholder={t('searchForReports', 'Search for reports by name, description, or category')}
                    onChange={handleSearchChange}
                  />
                  {filters}
                </TableToolbarContent>
              </TableToolbar>

              <Table {...getTableProps()} aria-label={t('reportsTable', 'Reports table')}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                    ))}
                    <TableHeader aria-label={t('rowActions', 'Row actions')} />
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row, index) => {
                    return (
                      <React.Fragment key={row.id}>
                        <TableRow {...getRowProps({ row })}>
                          {row.cells.map((cell) => {
                            if (cell.info.header === 'status') {
                              return (
                                <TableCell key={cell.id}>
                                  <Tag size="sm">{cell.value}</Tag>
                                </TableCell>
                              );
                            }
                            return <TableCell key={cell.id}>{cell.value}</TableCell>;
                          })}
                          <TableCell className="cds--table-column-menu">
                            <OverflowMenu size="sm" flipped aria-label="overflow-menu">
                              <OverflowMenuItem
                                onClick={() => handleRequestReport(results[index])}
                                itemText={t('requestReport', 'Request Report')}
                              />
                              <OverflowMenuItem
                                onClick={() => navigate(`/report/${results[index].id}`)}
                                itemText={t('viewHistory', 'View History')}
                              />
                            </OverflowMenu>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }}
      </DataTable>
      <Pagination
        itemsPerPageText={t('itemsPerPage', 'Items per page:')}
        forwardText={t('nextPage', 'Next page')}
        backwardText={t('previousPage', 'Previous page')}
        itemRangeText={(min, max, total) => t('minMaxItems', '{{min}}-{{max}} of {{total}} items', { min, max, total })}
        pageRangeText={(_current, total) => t('pageRangeText', 'of {{count}} pages', { count: total })}
        page={currentPage}
        pageSize={pageSize}
        pageSizes={pageSizes?.length > 0 ? pageSizes : []}
        totalItems={filteredRows?.length ?? 0}
        onChange={handlePaginationChange}
      />
    </div>
  );
};

export default ReportTable;
