import { showSnackbar } from '@openmrs/esm-framework';
import { type TFunction } from 'i18next';

export function createPaymentNotifications(t: TFunction) {
  return {
    coverLockFailed(subtitle: string) {
      showSnackbar({
        title: t('coverLockFailedShort', 'Cover lock failed'),
        kind: 'error',
        subtitle,
        isLowContrast: true,
      });
    },
    interventionLookupFailed(code: string) {
      showSnackbar({
        title: t('interventionLookupFailed', 'Intervention lookup failed'),
        kind: 'error',
        subtitle: t(
          'interventionNotFound',
          'Could not resolve intervention {{code}} on this claim. Try reopening the workspace.',
          { code },
        ),
        isLowContrast: true,
      });
    },
    shaRejected(subtitle?: string) {
      showSnackbar({
        title: t('shaRejectedLines', 'SHA rejected the bill lines'),
        kind: 'error',
        subtitle,
        isLowContrast: true,
      });
    },
    paymentSaved() {
      showSnackbar({
        title: t('paymentSaved', 'Payment saved'),
        kind: 'success',
        subtitle: t('paymentSavedSuccessfully', 'Payment saved successfully'),
      });
    },
    paymentError(subtitle: string) {
      showSnackbar({
        title: t('errorProcessingPayment', 'Error processing payment'),
        kind: 'error',
        subtitle,
        isLowContrast: true,
      });
    },
    partialPayment({ saved, total, error }: { saved: number; total: number; error: string }) {
      showSnackbar({
        title: t('partialPaymentSaved', 'Partial payment saved'),
        kind: 'warning',
        subtitle: t(
          'partialPaymentSavedSubtitle',
          '{{saved}} of {{total}} payment(s) saved. Reopen the bill to settle the remaining balance. Error: {{error}}',
          { saved, total, error },
        ),
        isLowContrast: true,
      });
    },
  };
}
