import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { closeShrVisit, refreshShrVisit, type ShrConsent } from '../shr-summary.resource';

type ApiError = {
  message?: string;
  responseBody?: string | { message?: string; error?: { message?: string } };
};

const getErrorMessage = (err: ApiError, fallback: string): string => {
  const { responseBody } = err;
  if (typeof responseBody === 'string' && responseBody.trim()) {
    try {
      const parsed = JSON.parse(responseBody) as { message?: string };
      if (parsed?.message) {
        return parsed.message;
      }
    } catch {
      return responseBody;
    }
  }
  if (responseBody && typeof responseBody === 'object') {
    return responseBody.message || responseBody.error?.message || fallback;
  }
  return err.message || fallback;
};

type UseShrVisitActionsArgs = {
  consent: ShrConsent | null;
  /** Re-reads the consent so the dashboard reflects the visit's new state. */
  onChange: () => void;
};

/**
 * Actions on an open SHR visit: renewing the consent token before it expires, and closing the
 * visit once the encounter is done. Both hit the {@code /shr-visit/{visitId}} endpoints and then
 * ask the caller to re-read the consent — a close drops the dashboard back to the start-visit
 * prompt (which sends a fresh OTP), a refresh just pushes out the expiry.
 */
export function useShrVisitActions({ consent, onChange }: UseShrVisitActionsArgs) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const visitId = consent?.visitId ?? null;

  const handleRefresh = useCallback(async () => {
    if (!visitId) {
      return;
    }

    setIsRefreshing(true);
    try {
      await refreshShrVisit(visitId);
      showSnackbar({
        title: t('shrVisitRefreshed', 'Visit refreshed'),
        subtitle: t(
          'shrVisitRefreshedMessage',
          'The consent token was renewed. Records stay accessible for this visit.',
        ),
        kind: 'success',
        isLowContrast: true,
      });
      onChange();
    } catch (err) {
      showSnackbar({
        title: t('errorRefreshingShrVisit', 'Could not refresh visit'),
        subtitle: getErrorMessage(err as ApiError, t('unknownError', 'An unknown error occurred')),
        kind: 'error',
        isLowContrast: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [onChange, t, visitId]);

  const handleClose = useCallback(async () => {
    if (!visitId) {
      return;
    }

    setIsClosing(true);
    try {
      await closeShrVisit(visitId);
      showSnackbar({
        title: t('shrVisitClosed', 'Visit closed'),
        subtitle: t('shrVisitClosedMessage', 'The SHR visit was closed. Reopening it requires a new patient consent.'),
        kind: 'success',
        isLowContrast: true,
      });
      onChange();
    } catch (err) {
      showSnackbar({
        title: t('errorClosingShrVisit', 'Could not close visit'),
        subtitle: getErrorMessage(err as ApiError, t('unknownError', 'An unknown error occurred')),
        kind: 'error',
        isLowContrast: true,
      });
    } finally {
      setIsClosing(false);
    }
  }, [onChange, t, visitId]);

  return {
    canManageVisit: Boolean(visitId),
    isRefreshing,
    isClosing,
    handleRefresh,
    handleClose,
  };
}
