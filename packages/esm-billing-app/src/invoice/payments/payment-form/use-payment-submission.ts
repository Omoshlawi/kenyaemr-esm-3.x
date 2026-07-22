import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import startCase from 'lodash-es/startCase';
import { showModal, Workspace2DefinitionProps } from '@openmrs/esm-framework';

import { type LineItem, type MappedBill } from '../../../types';
import { extractErrorMessagesFromResponse } from '../../../utils';
import { makeAllocatedPayment, makePayment } from '../payments.resource';
import { type SupplementaryScheme } from '../../../billing-form/social-health-authority/type';
import { shaDispatchFailed } from './constant';
import { type InterventionItem, type PaymentModeFormData } from './payment.types';
import {
  buildAllocatedPaymentPayload,
  buildAllocationsForPayments,
  buildExplicitAllocations,
  buildPaymentPayload,
  buildReceiptUrl,
  revalidateBillCaches,
} from './payment-submission.utils';
import { createPaymentNotifications } from './payment-notifications';
import { dispatchShaLine, hasShaInsuranceLine, isShaInsuranceLine, lockShaCover } from './sha-payment-submission';

type UsePaymentSubmissionArgs = {
  bill: MappedBill;
  unPaidLineItems: Array<LineItem>;
  billLineItemsUuids: Array<string>;
  isSHAVisit: boolean;
  authorizationCode: string | null;
  selectedScheme: SupplementaryScheme | null;
  insurancePaymentMethod: string;
  interventionItems: Array<InterventionItem>;
  allowPartial: boolean;
  manualAllocation: boolean;
  closeWorkspace: Workspace2DefinitionProps['closeWorkspace'];
  setShaError: (error: string | null) => void;
};

export function usePaymentSubmission({
  bill,
  unPaidLineItems,
  billLineItemsUuids,
  isSHAVisit,
  authorizationCode,
  selectedScheme,
  insurancePaymentMethod,
  interventionItems,
  allowPartial,
  manualAllocation,
  closeWorkspace,
  setShaError,
}: UsePaymentSubmissionArgs) {
  const { t } = useTranslation();

  const handlePrintReceipt = useCallback(
    (paymentsUuids: Array<string>, lineItemUuids: Array<string>) => {
      const receiptUrl = buildReceiptUrl(bill, lineItemUuids, paymentsUuids);
      const dispose = showModal('print-preview-modal', {
        onClose: () => dispose(),
        title: `${t('receipt', 'Receipt')} ${bill?.receiptNumber} - ${startCase(bill?.patientName)}`,
        documentUrl: receiptUrl,
      });
    },
    [bill, t],
  );

  const onSubmit = useCallback(
    async (data: PaymentModeFormData) => {
      const notify = createPaymentNotifications(t);
      const createdUuids: Array<string> = [];
      let failedAtIndex: number | null = null;
      let failureError: unknown = null;

      const allocationsByPayment = !allowPartial
        ? null
        : manualAllocation
        ? data.payments.map((line) => buildExplicitAllocations(line))
        : buildAllocationsForPayments(data.payments, unPaidLineItems);

      if (
        isSHAVisit &&
        hasShaInsuranceLine(data.payments, insurancePaymentMethod) &&
        authorizationCode &&
        selectedScheme
      ) {
        const lockResult = await lockShaCover({ authorizationCode, selectedScheme, t });
        if (!lockResult.ok) {
          notify.coverLockFailed(lockResult.error);
          setShaError(lockResult.error);
          return;
        }
      }

      for (let i = 0; i < data.payments.length; i++) {
        const line = data.payments[i];

        if (isShaInsuranceLine(line, isSHAVisit, insurancePaymentMethod)) {
          const shaResult = await dispatchShaLine({ line, interventionItems, authorizationCode, unPaidLineItems, t });
          if (!shaResult.ok) {
            if (shaResult.reason === 'intervention-not-found') {
              notify.interventionLookupFailed(shaResult.code);
            } else {
              notify.shaRejected(shaResult.error);
              setShaError(shaResult.error ?? t('shaFailed', 'Failed to add claim lines'));
            }
            failedAtIndex = i;
            failureError = { [shaDispatchFailed]: true };
            break;
          }
        }

        try {
          const response = allocationsByPayment
            ? await makeAllocatedPayment(bill.uuid, buildAllocatedPaymentPayload(line, allocationsByPayment[i]))
            : await makePayment(bill.uuid, buildPaymentPayload(line, billLineItemsUuids));
          if (!response.ok || !response.data?.uuid) {
            throw response;
          }
          createdUuids.push(response.data.uuid);
        } catch (err) {
          failedAtIndex = i;
          failureError = err;
          break;
        }
      }

      revalidateBillCaches(bill.uuid);

      if (failedAtIndex === null) {
        notify.paymentSaved();
        const receiptLineItemUuids = allocationsByPayment
          ? Array.from(new Set(allocationsByPayment.flat().map((allocation) => allocation.lineItem)))
          : billLineItemsUuids;
        handlePrintReceipt(createdUuids, receiptLineItemUuids);
        closeWorkspace({ discardUnsavedChanges: true });
        return;
      }

      const shaSnackbarAlreadyShown = Boolean((failureError as Record<string, unknown> | null)?.[shaDispatchFailed]);

      const errorDetail = extractErrorMessagesFromResponse((failureError as { responseBody?: unknown })?.responseBody);

      if (createdUuids.length === 0) {
        if (!shaSnackbarAlreadyShown) {
          notify.paymentError(errorDetail);
        }
        return;
      }
      notify.partialPayment({
        saved: createdUuids.length,
        total: data.payments.length,
        error: shaSnackbarAlreadyShown ? t('seePreviousError', 'See previous error') : errorDetail,
      });
      closeWorkspace({ discardUnsavedChanges: true });
    },
    [
      bill,
      unPaidLineItems,
      billLineItemsUuids,
      isSHAVisit,
      authorizationCode,
      selectedScheme,
      insurancePaymentMethod,
      interventionItems,
      allowPartial,
      manualAllocation,
      closeWorkspace,
      setShaError,
      handlePrintReceipt,
      t,
    ],
  );

  return onSubmit;
}
