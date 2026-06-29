import React, { useCallback, useState } from 'react';
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
import { usePaginationInfo, usePagination, useDebounce, launchWorkspace2, navigate } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';

type ReportTableProps = {
  tableRows: Array<any>;
  tableHeaders: Array<any>;
  tableTitle: string;
  tableDescription: string;
};

const ReportTable: React.FC<ReportTableProps> = ({ tableRows, tableHeaders, tableTitle, tableDescription }) => {
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { t } = useTranslation();
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
  const { pageSizes } = usePaginationInfo(pageSize, filteredRows.length, currentPage, filteredRows.length);

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

  const handleRequestReport = useCallback((report: Record<string, unknown>) => {
    launchWorkspace2('report-request-workspace', { reportUuid: report.id });
  }, []);

  return (
    <div className={styles.container}>
      <DataTable rows={results} headers={tableHeaders} isSortable useZebraStyles>
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
                    placeholder={t('searchForReports', 'Search for reports by name, description, or category')}
                    onChange={handleSearchChange}
                  />
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
                            <OverflowMenu flipped aria-label="overflow-menu">
                              <OverflowMenuItem
                                onClick={() => handleRequestReport(results[index])}
                                itemText={t('requestReport', 'Request Report')}
                              />
                              <OverflowMenuItem
                                onClick={() =>
                                  navigate({ to: `\${openmrsSpaBase}/reporting/report/${results[index].id}` })
                                }
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
      {results.length > 0 && (
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
          pageSizes={pageSizes ?? [10, 20, 30]}
          totalItems={tableRows?.length}
          onChange={({ page, pageSize }) => {
            goTo(page);
            setPageSize(pageSize);
          }}
        />
      )}
    </div>
  );
};

export default ReportTable;
