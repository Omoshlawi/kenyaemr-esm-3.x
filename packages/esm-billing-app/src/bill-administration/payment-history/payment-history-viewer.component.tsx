import { DataTableSkeleton } from '@carbon/react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyPatientBill from '../../past-patient-bills/patient-bills-dashboard/empty-patient-bill.component';
import { PaymentHistoryTable } from './payment-history-table.component';
import { usePaymentFilterContext } from './usePaymentFilterContext';
import { usePaymentTransactionHistory } from './usePaymentTransactionHistory';

export const PaymentHistoryViewer = () => {
  const { t } = useTranslation();
  const { filters } = usePaymentFilterContext();
  const [pageSize, setPageSize] = useState(10);
  const { bills, isLoading, pagination } = usePaymentTransactionHistory(filters, pageSize);

  const headers = useMemo(
    () => [
      { header: t('billDate', 'Date'), key: 'dateCreated' },
      { header: t('patientName', 'Patient Name'), key: 'patientName' },
      { header: t('identifier', 'Identifier'), key: 'identifier' },
      { header: t('totalAmount', 'Total Amount'), key: 'totalAmount' },
      { header: t('billingService', 'Service'), key: 'billingService' },
      { header: t('referenceCodes', ' Reference Codes'), key: 'referenceCodes' },
      { header: t('status', 'Status'), key: 'status' },
    ],
    [t],
  );
  return (
    <>
      {isLoading ? (
        <DataTableSkeleton headers={headers} aria-label={t('transactionHistory', 'Transaction History')} />
      ) : bills.length > 0 ? (
        <PaymentHistoryTable
          headers={headers}
          rows={bills}
          pagination={pagination}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      ) : (
        <EmptyPatientBill
          title={t('noTransactionHistory', 'No transaction history')}
          subTitle={t('noTransactionHistorySubtitle', 'No transaction history loaded for the selected filters')}
        />
      )}
    </>
  );
};
