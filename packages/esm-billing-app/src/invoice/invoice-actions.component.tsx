import { Button, InlineLoading, Popover, PopoverContent } from '@carbon/react';
import { Close, Printer, Wallet, FolderOpen, BaggageClaim, Send } from '@carbon/react/icons';
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
  usePatient,
  launchWorkspace2,
} from '@openmrs/esm-framework';
import React, { useMemo, useState } from 'react';
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
import { useVisit } from '../claims/patient-dashboard/form/claims-form.resource';
import { processPhcClaim } from '../billing.resource';
import { extractFetchError, extractUpstreamError } from '../claims/claims-management/table/virtual-claim-preauth/utils';
import { useFacilityRegistry } from '../hooks/useFacilityRegistry';
import { getPatientCRNumber } from '../billing-form/social-health-authority/helper';

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
    crIdentificationNumberUUID,
  } = useConfig<BillingConfig>();

  const visitUuid = activeVisit?.uuid;

  const { isSHA: isSHAVisit } = useVisitAttribute(visitUuid ?? '', insuranceScheme);

  const { facilityLevel } = useFacilityRegistry();
  const isLevel2Facility = facilityLevel === '2';

  const { patient: fhirPatient } = usePatient(patientUuid);
  const patientCRId = useMemo(
    () => (fhirPatient ? getPatientCRNumber(fhirPatient as fhir.Patient, crIdentificationNumberUUID) : null),
    [fhirPatient, crIdentificationNumberUUID],
  );

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

  const [isSubmittingPhcClaim, setIsSubmittingPhcClaim] = useState(false);

  const handleSubmitPhcClaim = async () => {
    if (!visitUuid || !billUuid) {
      return;
    }
    setIsSubmittingPhcClaim(true);
    showSnackbar({
      title: t('processingPhcClaim', 'Processing PHC claim'),
      subtitle: t('processingPhcClaimSubtitle', 'This can take a moment — please wait…'),
      kind: 'info',
      timeoutInMs: 8000,
    });
    try {
      const response = await processPhcClaim(visitUuid, billUuid);
      if (response?.success === false) {
        throw new Error(extractUpstreamError(response, t('phcClaimFailed', 'Failed to submit PHC claim')));
      }
      showSnackbar({
        title: t('phcClaimSubmitted', 'PHC claim submitted'),
        subtitle: response?.message ?? t('phcClaimSubmittedSubtitle', 'The PHC claim was processed successfully.'),
        kind: 'success',
      });
      navigate({ to: `${spaBasePath}/accounting/patient/${patientUuid}/${billUuid}/claims` });
      launchWorkspace2(
        'claim-submission-workspace',
        {
          workspaceTitle: t('submitClaim', 'Submit claim'),
          consentToken: response?.consentToken ?? '',
          invoiceNumber: response?.invoiceNumber ?? '',
          serviceType: response?.service_type ?? '',
          patientUuid: patientUuid ?? '',
          patientCRId: patientCRId ?? '',
          interventions: response?.interventions ?? [],
          mutate: mutateClaimForm,
        },
        {},
        {},
      );
    } catch (error: any) {
      showSnackbar({
        title: t('phcClaimFailed', 'Failed to submit PHC claim'),
        subtitle: extractFetchError(error, t('unknownError', 'Unknown error occurred')),
        kind: 'error',
      });
    } finally {
      setIsSubmittingPhcClaim(false);
    }
  };

  return (
    <div className={styles.invoiceSummaryActions}>
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

      {bill?.closed && isSHAVisit && !isLevel2Facility && (
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

      {isSHAVisit && visitUuid && isLevel2Facility && (
        <Button
          onClick={handleSubmitPhcClaim}
          disabled={isSubmittingPhcClaim}
          kind="secondary"
          size="sm"
          renderIcon={isSubmittingPhcClaim ? undefined : Send}
          iconDescription={t('processPhcClaim', 'Process PHC claim')}
          tooltipPosition="bottom">
          {isSubmittingPhcClaim ? (
            <InlineLoading description={t('processingPhcClaim', 'Processing PHC claim') + '...'} />
          ) : (
            t('submitPhcClaim', 'Submit PHC claim')
          )}
        </Button>
      )}
    </div>
  );
}
