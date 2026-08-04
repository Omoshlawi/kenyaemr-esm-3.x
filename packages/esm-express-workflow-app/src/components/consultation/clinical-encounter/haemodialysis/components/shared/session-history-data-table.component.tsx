import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import type { HistoryTableColumn, HistoryTableRow } from '../../utils/dialysis-session-history';
import styles from './session-history-data-table.scss';

type Props = {
  columns: HistoryTableColumn[];
  rows: HistoryTableRow[];
  emptyMessage?: string;
};

const SessionHistoryDataTable: React.FC<Props> = ({
  columns,
  rows,
  emptyMessage = 'No dialysis sessions recorded yet.',
}) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const tableHeaders = useMemo(() => columns.map((column) => ({ key: column.key, header: column.header })), [columns]);

  const pagedRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);

  if (rows.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div className={styles.tableContainer}>
      <DataTable rows={pagedRows} headers={tableHeaders}>
        {({ rows: dataRows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <TableContainer>
            <Table {...getTableProps()} size="sm">
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
                {dataRows.map((row) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <Pagination
        totalItems={rows.length}
        page={page}
        pageSize={pageSize}
        pageSizes={[5, 10, 25]}
        size="sm"
        itemsPerPageText={t('itemsPerPage', 'Items per page:')}
        onChange={({ page: nextPage, pageSize: nextSize }) => {
          setPage(nextPage);
          setPageSize(nextSize);
        }}
      />
    </div>
  );
};

export default SessionHistoryDataTable;
