import React, { useMemo, useState } from 'react';
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  Search,
  TableContainer,
  Button,
  DataTableHeader,
} from '@carbon/react';
import { Download } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { useDebounce, useLayoutType, showSnackbar } from '@openmrs/esm-framework';
import { MappedBill, PaymentStatus } from '../../types';
import { exportToExcel } from '../../helpers/excelExport';
import dayjs from 'dayjs';
import { useCurrencyFormatting } from '../../helpers/currency';
import { fetchBillsForExport } from '../../billing.resource';
import { usePaymentFilterContext } from './usePaymentFilterContext';
import { usePaymentHistoryQueryFilters } from './usePaymentTransactionHistory';

interface TablePagination {
  totalCount: number;
  currentPage: number;
  paginated: boolean;
  goTo: (page: number) => void;
}

export const PaymentHistoryTable = ({
  headers,
  rows = [],
  pagination,
  pageSize,
  onPageSizeChange,
}: {
  headers: Array<DataTableHeader>;
  rows: Array<MappedBill>;
  pagination: TablePagination;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const { filters, dateRange } = usePaymentFilterContext();
  const { cashierUuids, paymentModeUuids, serviceTypeUuids } = usePaymentHistoryQueryFilters(filters);

  const responsiveSize = useLayoutType() !== 'tablet' ? 'sm' : 'md';
  const [searchString, setSearchString] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearchString = useDebounce(searchString, 500);

  // Free-text search runs client-side against the current page only; backend search is not yet wired up.
  const searchResults = useMemo(() => {
    if (!debouncedSearchString || debouncedSearchString.trim() === '') {
      return rows;
    }
    const search = debouncedSearchString.toLowerCase();
    return rows.filter((activeBillRow) =>
      Object.entries(activeBillRow).some(([header, value]) => {
        if (header === 'patientUuid') {
          return false;
        }
        return `${value}`.toLowerCase().includes(search);
      }),
    );
  }, [debouncedSearchString, rows]);

  const transformedRows = searchResults.map((row) => {
    return {
      ...row,
      id: `${row.id}`,
      billingService: row.lineItems.map((item) => item.billableService).join(', '),
      totalAmount: formatCurrency(row.payments.reduce((acc, payment) => acc + payment.amountTendered, 0)),
      referenceCodes: row.payments
        .map(({ attributes }) => attributes.map(({ value }) => value).join(', '))
        .filter((code) => code !== '')
        .join(', '),
      status: t(row.status, row.status),
    };
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const allBills = await fetchBillsForExport({
        billStatus: PaymentStatus.PAID,
        startingDate: dayjs(dateRange[0]).toDate(),
        endDate: dayjs(dateRange[1]).toDate(),
        cashierUuids,
        paymentModeUuids,
        serviceTypeUuids,
      });

      const data = allBills.map((row) => {
        return {
          'Receipt Number': row.receiptNumber,
          'Patient ID': row.identifier,
          'Patient Name': row.patientName,
          'Mode of Payment': row.payments.map((payment) => payment.instanceType.name).join(', '),
          'Total Amount Due': row.lineItems.reduce((acc, item) => acc + item.price, 0),
          'Date of Payment': row.payments[0] ? dayjs(row.payments[0].dateCreated).format('DD-MM-YYYY') : '',
          'Total Amount Paid': row.payments.reduce((acc, payment) => acc + payment.amountTendered, 0),
          'Reason/Reference': row.payments
            .map(({ attributes }) => attributes.map(({ value }) => value).join(' '))
            .filter((code) => code !== '')
            .join(', '),
        };
      });

      exportToExcel(data, {
        fileName: `Transaction History - ${dayjs().format('DDD-MMM-YYYY:HH-mm-ss')}`,
        sheetName: t('paymentHistory', 'Payment History'),
      });
    } catch (error) {
      showSnackbar({
        kind: 'error',
        title: t('exportFailed', 'Export failed'),
        subtitle: error?.message ?? t('exportFailedSubtitle', 'Unable to export transaction history'),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <Search
          size="sm"
          placeholder={t('searchTransactions', 'Search transactions table')}
          labelText={t('searchTransactions', 'Search transactions table')}
          closeButtonLabelText={t('clearSearch', 'Clear search input')}
          id="search-transactions"
          onChange={(event) => setSearchString(event.target.value)}
        />

        <Button
          size={responsiveSize}
          renderIcon={Download}
          iconDescription="Download"
          onClick={handleExport}
          disabled={isExporting}>
          {isExporting ? t('exporting', 'Exporting…') : t('download', 'Download')}
        </Button>
      </div>
      <DataTable useZebraStyles size="sm" rows={transformedRows} headers={headers}>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps, getTableContainerProps }) => (
          <TableContainer {...getTableContainerProps()}>
            <Table {...getTableProps()} size="sm" aria-label="sample table">
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader
                      key={header.key}
                      {...getHeaderProps({
                        header,
                      })}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    {...getRowProps({
                      row,
                    })}>
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
      {pagination.paginated && (
        <Pagination
          forwardText={t('nextPage', 'Next page')}
          backwardText={t('previousPage', 'Previous page')}
          page={pagination.currentPage ?? 1}
          pageSize={pageSize ?? 10}
          pageSizes={[10, 20, 50, 100]}
          totalItems={pagination.totalCount ?? 0}
          size={responsiveSize}
          onChange={({ page: newPage, pageSize: newPageSize }) => {
            if (newPageSize !== pageSize) {
              onPageSizeChange(newPageSize);
            }
            if (newPage !== pagination.currentPage) {
              pagination.goTo(newPage);
            }
          }}
        />
      )}
    </div>
  );
};
