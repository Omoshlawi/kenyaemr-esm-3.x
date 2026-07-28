import React from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  DataTable,
  TableContainer,
  DataTableSkeleton,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { usePaymentFilterContext } from './usePaymentFilterContext';
import EmptyPatientBill from '../../past-patient-bills/patient-bills-dashboard/empty-patient-bill.component';
import { useLayoutType } from '@openmrs/esm-framework';
import { usePaymentHistoryQueryFilters } from './usePaymentTransactionHistory';
import { usePaymentModeSummary } from '../../billing.resource';
import { PaymentStatus } from '../../types';
import dayjs from 'dayjs';
import { useCurrencyFormatting } from '../../helpers/currency';

const PaymentMethodDistribution = () => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();

  const responsiveSize = useLayoutType() !== 'tablet' ? 'sm' : 'md';
  const { filters, dateRange } = usePaymentFilterContext();
  const { cashierUuids, paymentModeUuids, serviceTypeUuids } = usePaymentHistoryQueryFilters(filters);
  const { summaries, isLoading } = usePaymentModeSummary({
    billStatus: PaymentStatus.PAID,
    startingDate: dayjs(dateRange[0]).toDate(),
    endDate: dayjs(dateRange[1]).toDate(),
    cashierUuids,
    paymentModeUuids,
    serviceTypeUuids,
  });

  const rows = summaries.map((summary, index) => ({
    id: index.toString(),
    paymentMode: summary?.paymentMode,
    total: formatCurrency(summary?.total as number),
  }));

  const headers = [
    {
      key: 'paymentMode',
      header: t('paymentMode', 'Payment Mode'),
    },
    {
      key: 'total',
      header: t('total', 'Total'),
    },
  ];

  const computedTotal = summaries.reduce((acc, summary) => acc + (summary?.total ?? 0), 0);

  if (isLoading) {
    return <DataTableSkeleton headers={headers} aria-label="sample table" />;
  }

  if (computedTotal === 0) {
    return (
      <EmptyPatientBill
        title={t('noPaymentModes', 'No payment modes found')}
        subTitle={t('noPaymentModesSubtitle', 'No payment modes found for the selected filters')}
      />
    );
  }

  return (
    <DataTable useZebraStyles size={responsiveSize} rows={rows} headers={headers}>
      {({ rows, headers, getHeaderProps, getRowProps, getTableProps, getTableContainerProps }) => (
        <TableContainer {...getTableContainerProps()}>
          <Table {...getTableProps()} aria-label="sample table">
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
  );
};

export default PaymentMethodDistribution;
