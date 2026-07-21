import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { type PreauthQueueItem } from '../../../../../../billing-form/social-health-authority/type';
import { cancelPreauth } from '../../../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { extractFetchError, extractUpstreamError, handleQueueMutate } from '../../utils';
import { virtualClaimBaseUrl } from '../../constants';

interface UseCancelPreauthParams {
  item?: PreauthQueueItem;
  mutate?: () => void;
  onSuccess: () => void;
}

export function useCancelPreauth({ item, mutate, onSuccess }: UseCancelPreauthParams) {
  const { t } = useTranslation();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancelPreauth = async () => {
    if (!item) {
      return;
    }
    setCancelError(null);
    setIsCancelling(true);
    try {
      const result = await cancelPreauth(item.authorization_code, item.intervention_code);
      if (!result.success) {
        throw new Error(extractUpstreamError(result as any, t('cancelPreauthFailed', 'Failed to cancel preauth')));
      }
      showSnackbar({
        title: t('cancelPreauth', 'Cancel preauth'),
        subtitle: t('preauthCancelledSuccessfully', 'Pre-authorization cancelled successfully'),
        kind: 'success',
      });
      handleQueueMutate(`${virtualClaimBaseUrl}/preauth-queue`);
      mutate?.();
      onSuccess();
    } catch (err: unknown) {
      setCancelError(extractFetchError(err, t('cancelPreauthFailed', 'Failed to cancel preauth')));
    } finally {
      setIsCancelling(false);
    }
  };

  return { handleCancelPreauth, isCancelling, cancelError };
}
