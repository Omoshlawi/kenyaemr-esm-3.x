import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { type PreauthQueueItem, type PreauthDoctor } from '../../../../../../billing-form/social-health-authority/type';
import { removePreauthDoctor } from '../../../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { extractFetchError, extractUpstreamError, handleQueueMutate } from '../../utils';
import { virtualClaimBaseUrl } from '../../constants';

interface UseRemoveDoctorParams {
  item?: PreauthQueueItem;
  doctor?: PreauthDoctor;
  mutate?: () => void;
  onSuccess: () => void;
}

export function useRemoveDoctor({ item, doctor, mutate, onSuccess }: UseRemoveDoctorParams) {
  const { t } = useTranslation();
  const [isRemovingDoctor, setIsRemovingDoctor] = useState(false);
  const [removeDoctorError, setRemoveDoctorError] = useState<string | null>(null);

  const handleRemoveDoctor = async () => {
    if (!item || !doctor) {
      return;
    }

    setRemoveDoctorError(null);
    setIsRemovingDoctor(true);

    try {
      const result = await removePreauthDoctor(
        item.authorization_code,
        item.intervention_code,
        doctor.identification_number,
      );

      if (!result.success) {
        throw new Error(
          extractUpstreamError(
            result as any,
            t('removeDoctorFailed', 'Failed to remove doctor from this preauthorization'),
          ),
        );
      }

      showSnackbar({
        title: t('removeDoctor', 'Remove doctor'),
        subtitle: t('doctorRemovedSuccessfully', 'Doctor removed successfully'),
        kind: 'success',
      });
      handleQueueMutate(`${virtualClaimBaseUrl}/preauth-queue`);
      mutate?.();
      onSuccess();
    } catch (err: unknown) {
      setRemoveDoctorError(extractFetchError(err, t('removeDoctorFailed', 'Failed to remove doctor')));
    } finally {
      setIsRemovingDoctor(false);
    }
  };

  return { handleRemoveDoctor, isRemovingDoctor, removeDoctorError };
}
