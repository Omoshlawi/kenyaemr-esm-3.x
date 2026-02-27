import React from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
} from '@carbon/react';
import { MappedBill } from '../../../types';
import { formatDate } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useCurrencyFormatting } from '../../../helpers/currency';
import styles from './payment-history.scss';

type PaymentHistoryProps = {
  bill: MappedBill;
};

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ bill }) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();

  const headers = [
    {
      key: 'dateCreated',
      header: t('dateOfPayment', 'Date of payment'),
    },
    {
      key: 'amountTendered',
      header: t('amountTendered', 'Amount tendered'),
    },
    {
      key: 'paymentMethod',
      header: t('paymentMethod', 'Payment method'),
    },
  ];
  const rows = bill?.payments?.map((payment) => ({
    id: `${payment.uuid}`,
    dateCreated: formatDate(new Date(payment.dateCreated)),
    amountTendered: formatCurrency(payment.amountTendered),
    amount: formatCurrency(payment.amount),
    paymentMethod: payment.instanceType.name,
  }));

  if (Object.values(bill?.payments ?? {}).length === 0) {
    return;
  }

  return (
    <div className={styles.paymentHistoryContainer}>
      <DataTable headers={headers} isSortable rows={rows} size="sm" useZebraStyles>
        {({ rows, headers, getRowProps, getTableProps }) => (
          <TableContainer
            description={t('listOfPaymentsInThisBill', 'List of payments in this bill')}
            title={t('paymentSummary', 'Payment summary')}>
            <Table {...getTableProps()} aria-label="List of payments in this bill">
              <TableHead>
                {headers.map((header) => (
                  <TableHeader key={header.key}>{header.header}</TableHeader>
                ))}
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow {...getRowProps({ row })}>
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
    </div>
  );
};

export default PaymentHistory;
