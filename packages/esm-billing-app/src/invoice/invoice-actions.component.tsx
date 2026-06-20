import { Button, Popover, PopoverContent } from '@carbon/react';
import { Close, Printer, Wallet, FolderOpen, BaggageClaim } from '@carbon/react/icons';
import {
  restBaseUrl,
  showModal,
  UserHasAccess,
  useFeatureFlag,
  useVisitContextStore,
  defaultVisitCustomRepresentation,
  navigate,
  showSnackbar,
  showToast,
  updateVisit,
  useConfig,
} from '@openmrs/esm-framework';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { mutate } from 'swr';
import { MappedBill, LineItem } from '../types';
import { spaBasePath } from '../constants';
import { useCheckShareGnum } from './invoice.resource';
import styles from './invoice.scss';
import startCase from 'lodash-es/startCase';
import { useCurrencyFormatting } from '../helpers/currency';
import { useVisitAttribute } from '../bill-administration/patient-billing/workspaces/create-bill/create-bill.resource';
import { BillingConfig } from '../config-schema';
import { useVisit } from '../claims/dashboard/form/claims-form.resource';

interface InvoiceActionsProps {
  readonly bill: MappedBill;
  readonly selectedLineItems?: LineItem[];
  readonly activeVisit?: any;
}

export function InvoiceActions({ bill, selectedLineItems = [], activeVisit }: InvoiceActionsProps) {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();

  const [isOpen, setIsOpen] = useState(false);
  const { billUuid, patientUuid } = useParams();
  const { checkSHARegNum } = useCheckShareGnum();
  const { patientUuid: visitStorePatientUuid, manuallySetVisitUuid } = useVisitContextStore();
  const isProcessClaimsFormEnabled = useFeatureFlag('healthInformationExchange');

  const {
    visitAttributeTypes: { insuranceScheme },
  } = useConfig<BillingConfig>();

  const visitUuid = activeVisit?.uuid;

  const { isSHA: isSHAVisit } = useVisitAttribute(visitUuid ?? '', insuranceScheme);

  const launchBillCloseOrReopenModal = (action: 'close' | 'reopen') => {
    const dispose = showModal('bill-action-modal', {
      closeModal: () => dispose(),
      bill: bill,
      action,
    });
  };

  const shouldCloseBill = bill.balance === 0 && !bill.closed;

  const handlePrint = (documentType: string, documentTitle: string) => {
    const dispose = showModal('print-preview-modal', {
      onClose: () => dispose(),
      title: documentTitle,
      documentUrl: `/openmrs${restBaseUrl}/cashier/print?documentType=${documentType}&billId=${bill?.id}`,
    });
  };

  const handleBillPayment = () => {
    const dispose = showModal('initiate-payment-modal', {
      closeModal: () => dispose(),
      bill: bill,
      selectedLineItems,
    });
  };

  const mutateClaimForm = async () => {
    const activeVisitUrlSuffix = `?patient=${patientUuid}&v=${defaultVisitCustomRepresentation}&includeInactive=false`;
    const retrospectiveVisitUuid = patientUuid && visitStorePatientUuid == patientUuid ? manuallySetVisitUuid : null;
    const retrospectiveVisitUrlSuffix = `/${retrospectiveVisitUuid}?v=${defaultVisitCustomRepresentation}`;
    const activeVisitUrl = `${restBaseUrl}/visit${activeVisitUrlSuffix}`;
    const retroVisitUrl = `${restBaseUrl}/visit${retrospectiveVisitUrlSuffix}`;
    await mutate((key) => typeof key === 'string' && (key.startsWith(activeVisitUrl) || key.startsWith(retroVisitUrl)));
  };

  const handleViewClaims = async () => {
    navigate({ to: `${spaBasePath}/accounting/patient/${patientUuid}/${billUuid}/claims` });
  };

  return (
    <div className="invoiceSummaryActions">
      <Popover isTabTip align="bottom-right" onKeyDown={() => {}} onRequestClose={() => setIsOpen(false)} open={isOpen}>
        <button
          className={styles.printButton}
          aria-expanded
          aria-label="Settings"
          onClick={() => setIsOpen(!isOpen)}
          type="button">
          <span className={styles.printButtonContent}>
            <span className={styles.printButtonText}>{t('print', 'Print')}</span>
            <Printer />
          </span>
        </button>
        <PopoverContent>
          <div className={styles.popoverContent}>
            <Button
              kind="ghost"
              size="sm"
              onClick={() =>
                handlePrint(
                  'invoice',
                  `${t('invoice', 'Invoice')} ${bill?.receiptNumber} - ${startCase(bill?.patientName)}`,
                )
              }
              renderIcon={Printer}>
              {t('printInvoice', 'Print Invoice')}
            </Button>
            <Button
              kind="ghost"
              size="sm"
              onClick={() => {
                const dispose = showModal('print-preview-modal', {
                  onClose: () => dispose(),
                  title: `${t('receipt', 'Receipt')} ${bill?.receiptNumber} - ${startCase(bill?.patientName)}`,
                  documentUrl: `/openmrs${restBaseUrl}/cashier/receipt?billId=${bill.id}`,
                });
              }}
              renderIcon={Printer}>
              {t('printReceipt', 'Print Receipt')}
            </Button>
            <Button
              kind="ghost"
              size="sm"
              onClick={() =>
                handlePrint(
                  'billstatement',
                  `${t('billStatement', 'Bill Statement')} ${bill?.receiptNumber} - ${startCase(bill?.patientName)}`,
                )
              }
              renderIcon={Printer}>
              {t('printBillStatement', 'Print Bill Statement')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {shouldCloseBill && (
        <UserHasAccess privilege="Close Cashier Bills">
          <Button
            kind="danger--ghost"
            size="sm"
            renderIcon={Close}
            iconDescription="Add"
            tooltipPosition="right"
            onClick={() => launchBillCloseOrReopenModal('close')}>
            {t('closeBill', 'Close Bill')}
          </Button>
        </UserHasAccess>
      )}
      {bill?.closed && (
        <UserHasAccess privilege="Reopen Cashier Bills">
          <Button
            kind="ghost"
            size="sm"
            renderIcon={FolderOpen}
            iconDescription="Add"
            tooltipPosition="right"
            onClick={() => launchBillCloseOrReopenModal('reopen')}>
            {t('reopen', 'Reopen')}
          </Button>
        </UserHasAccess>
      )}
      {bill?.balance !== 0 && (
        <Button
          onClick={handleBillPayment}
          disabled={bill?.balance === 0}
          size="sm"
          renderIcon={Wallet}
          iconDescription="Add"
          tooltipPosition="left">
          {t('mpesaPayment', 'MPESA Payment')}
        </Button>
      )}

      {bill?.closed && isSHAVisit && (
        <Button
          onClick={handleViewClaims}
          kind="secondary"
          size="sm"
          renderIcon={BaggageClaim}
          iconDescription={t('submitClaim', 'Submit claim')}
          tooltipPosition="bottom">
          {t('submitClaim', 'Submit claim')}
        </Button>
      )}
    </div>
  );
}
