import { Button, InlineLoading } from '@carbon/react';
import {
  ExtensionSlot,
  formatDatetime,
  launchWorkspace2,
  parseDate,
  usePatient,
  useVisit,
} from '@openmrs/esm-framework';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useBill } from '../billing.resource';
import { usePaymentsReconciler } from '../hooks/use-payments-reconciler';
import { LineItem, MappedBill, PaymentStatus } from '../types';
import InvoiceTable from './invoice-table.component';
import styles from './invoice.scss';
import capitalize from 'lodash-es/capitalize';
import { InvoiceActions } from './invoice-actions.component';
import { useCurrencyFormatting } from '../helpers/currency';
import PaymentHistory from './payments/payment-history/payment-history.component';
import { ArrowRight } from '@carbon/react/icons';
import { useClaimForVisit } from '../bill-administration/patient-billing/workspaces/create-bill/create-bill.resource';
import EmergencyClaimCountdown from '../components/emergency-claim-countdown.component';

const Invoice: React.FC = () => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const { billUuid, patientUuid } = useParams();
  const { patient, isLoading: isLoadingPatient, error: patientError } = usePatient(patientUuid);
  const { bill, isLoading: isLoadingBill, error: billingError } = useBill(billUuid);
  usePaymentsReconciler(billUuid);
  const { activeVisit, isLoading: isVisitLoading, error: visitError } = useVisit(patientUuid);
  const [selectedLineItems, setSelectedLineItems] = useState([]);

  const handleSelectItem = (lineItems: Array<LineItem>) => {
    const paidLineItems = bill?.lineItems?.filter((item) => item.paymentStatus === 'PAID') ?? [];
    const uniqueLineItems = [...new Set([...lineItems, ...paidLineItems])];
    setSelectedLineItems(uniqueLineItems);
  };

  const unPaidLineItems = useMemo(
    () => selectedLineItems?.filter((item) => item.paymentStatus !== PaymentStatus.PAID) ?? [],
    [selectedLineItems],
  );
  const selectedLineItemsAmountDue = useMemo(
    () => unPaidLineItems.reduce((acc, item) => acc + Number(item.price * item.quantity), 0),
    [unPaidLineItems],
  );

  const handleOpenPayments = () => {
    if (!bill) {
      return;
    }

    launchWorkspace2(
      'payment-workspace',
      { selectedLineItems, bill, workspaceTitle: t('payments', 'Payments') },
      {},
      {},
    );
  };

  useEffect(() => {
    const paidLineItems = bill?.lineItems?.filter((item) => item.paymentStatus === 'PAID') ?? [];
    setSelectedLineItems(paidLineItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill?.lineItems?.length]);

  if (isLoadingPatient || isLoadingBill || isVisitLoading) {
    return (
      <div className={styles.invoiceContainer}>
        <InlineLoading
          className={styles.loader}
          status="active"
          iconDescription="Loading"
          description="Loading patient header..."
        />
      </div>
    );
  }

  if (billingError || patientError || visitError) {
    return (
      <div className={styles.errorContainer}>
        <ErrorState
          headerTitle={t('invoiceError', 'Invoice error')}
          error={billingError ?? patientError ?? visitError}
        />
      </div>
    );
  }

  return (
    <div className={styles.invoiceContainer}>
      {patient && patientUuid && <ExtensionSlot name="patient-header-slot" state={{ patient, patientUuid }} />}
      <InvoiceSummary bill={bill} selectedLineItems={selectedLineItems} activeVisit={activeVisit} />
      <div className={styles.invoiceTableContainer}>
        <div>
          <InvoiceTable bill={bill} isLoadingBill={isLoadingBill} onSelectItem={handleSelectItem} />
          <PaymentHistory bill={bill} />
        </div>
        <div className={styles.addPaymentButtonContainer}>
          <div className={styles.summaryContainer}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{t('totalAmount', 'Total amount')}</span>
              <span className={styles.summaryValue}>{formatCurrency(bill?.totalAmount ?? 0)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{t('paymentsAmount', 'Payments amount')}</span>
              <span className={styles.summaryValue}>{formatCurrency(bill?.totalPayments ?? 0)}</span>
            </div>
            <div className={styles.summaryHorizontalDivider} />
          </div>
          <div className={styles.summaryButtonsContainer}>
            <div className={`${styles.summaryRow} ${styles.summaryTotalsRow}`}>
              <span className={styles.summaryLabel}>{t('amountDue', 'Amount due')}</span>
              <span className={styles.summaryValue}>{formatCurrency(selectedLineItemsAmountDue ?? 0)}</span>
            </div>
            <Button
              disabled={unPaidLineItems?.length === 0 || bill.balance <= 0}
              className={styles.addPaymentButton}
              renderIcon={ArrowRight}
              onClick={handleOpenPayments}>
              {t('payments', 'Payments')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function InvoiceSummary({
  bill,
  selectedLineItems,
  activeVisit,
}: {
  readonly bill: MappedBill;
  readonly selectedLineItems?: LineItem[];
  readonly activeVisit?: any;
}) {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const claimForVisit = useClaimForVisit(activeVisit?.uuid ?? '');
  const isEmergencyClaim = claimForVisit.serviceType?.toUpperCase() === 'EMERGENCY';

  return (
    <>
      <div className={styles.invoiceSummary}>
        <span className={styles.invoiceSummaryTitle}>{t('invoiceSummary', 'Invoice Summary')}</span>
        <div className={styles.invoiceSummaryTrailing}>
          {isEmergencyClaim && <EmergencyClaimCountdown expiry={claimForVisit.emergencyVisitExpiry} />}
          <InvoiceActions bill={bill} selectedLineItems={selectedLineItems} activeVisit={activeVisit} />
        </div>
      </div>
      <div className={styles.invoiceSummaryContainer}>
        <div className={styles.invoiceCard}>
          <InvoiceSummaryItem label={t('invoiceNumber', 'Invoice Number')} value={bill.receiptNumber} />
          <InvoiceSummaryItem
            label={t('dateAndTime', 'Date And Time')}
            value={formatDatetime(parseDate(bill.dateCreated), { mode: 'standard', noToday: true })}
          />
          <InvoiceSummaryItem label={t('invoiceStatus', 'Invoice Status')} value={bill?.status ? t(bill.status) : ''} />
          <InvoiceSummaryItem label={t('cashPoint', 'Cash Point')} value={bill?.cashPointName} />
          <InvoiceSummaryItem label={t('cashier', 'Cashier')} value={capitalize(bill?.cashier?.display)} />
        </div>
        <div className={styles.divider} />
        <div className={styles.invoiceCard}>
          <InvoiceSummaryItem label={t('totalAmount', 'Total Amount')} value={formatCurrency(bill?.totalAmount)} />
          <InvoiceSummaryItem
            label={t('totalExempted', 'Total Exempted')}
            value={formatCurrency(bill?.totalExempted)}
          />
          <InvoiceSummaryItem
            label={t('totalPayments', 'Total Payments')}
            value={formatCurrency(bill?.totalPayments)}
          />
          <InvoiceSummaryItem
            label={t('totalDeposits', 'Total Deposits')}
            value={formatCurrency(bill?.totalDeposits)}
          />
          <InvoiceSummaryItem label={t('balance', 'Balance')} value={formatCurrency(bill?.balance)} />
        </div>
      </div>
    </>
  );
}

export function InvoiceSummaryItem({ label, value }: { readonly label: string; readonly value: string | number }) {
  return (
    <div className={styles.invoiceSummaryItem}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

export default Invoice;
