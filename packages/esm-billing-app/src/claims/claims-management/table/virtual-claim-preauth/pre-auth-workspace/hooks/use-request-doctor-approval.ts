import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { type PreauthQueueItem, type PreauthDoctor } from '../../../../../../billing-form/social-health-authority/type';
import { sendDoctorPreauthRequest } from '../../../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { extractFetchError, extractUpstreamError, handleQueueMutate } from '../../utils';
import { virtualClaimBaseUrl } from '../../constants';

interface UseRequestDoctorApprovalParams {
  item?: PreauthQueueItem;
  doctor?: PreauthDoctor;
  mutate?: () => void;
  onSuccess: () => void;
}

export function useRequestDoctorApproval({ item, doctor, mutate, onSuccess }: UseRequestDoctorApprovalParams) {
  const { t } = useTranslation();
  const [isRequestingDoctor, setIsRequestingDoctor] = useState(false);
  const [requestDoctorError, setRequestDoctorError] = useState<string | null>(null);

  const handleRequestDoctorApproval = async () => {
    if (!item || !doctor) {
      return;
    }

    setRequestDoctorError(null);
    setIsRequestingDoctor(true);

    try {
      const requestType =
        item.service_type === 'EMERGENCY'
          ? 'EMERGENCY_CLAIM_DOCTOR_APPROVAL_REQUEST'
          : 'PREAUTH_DOCTOR_APPROVAL_REQUEST';
      const result = await sendDoctorPreauthRequest(
        item.authorization_code,
        item.intervention_code,
        doctor.identification_number,
        requestType,
      );

      if ((result as any)?.success === false) {
        throw new Error(
          extractUpstreamError(result as any, t('requestDoctorApprovalFailed', 'Could not request doctor approval')),
        );
      }

      showSnackbar({
        title: t('requestDoctorApproval', 'Request doctor approval'),
        subtitle: t('doctorApprovalRequestedSuccessfully', 'Doctor approval requested successfully'),
        kind: 'success',
      });
      handleQueueMutate(`${virtualClaimBaseUrl}/preauth-queue`);
      mutate?.();
      onSuccess();
    } catch (err: unknown) {
      setRequestDoctorError(
        extractFetchError(err, t('requestDoctorApprovalFailed', 'Could not request doctor approval')),
      );
    } finally {
      setIsRequestingDoctor(false);
    }
  };

  return { handleRequestDoctorApproval, isRequestingDoctor, requestDoctorError };
}
