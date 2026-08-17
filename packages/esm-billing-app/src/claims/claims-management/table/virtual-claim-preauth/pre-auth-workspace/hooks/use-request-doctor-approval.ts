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
  serviceType?: string;
  emergencyClaimId?: string | null;
  mutate?: () => void;
  onSuccess: () => void;
}

export function useRequestDoctorApproval({
  item,
  doctor,
  serviceType,
  emergencyClaimId,
  mutate,
  onSuccess,
}: UseRequestDoctorApprovalParams) {
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
      const isEmergency = (serviceType ?? item.service_type) === 'EMERGENCY';
      const resolvedEmergencyClaimId = emergencyClaimId ?? item.emergency_claim_id;

      if (isEmergency && !resolvedEmergencyClaimId) {
        throw new Error(
          t(
            'missingEmergencyClaimId',
            'Missing the emergency claim identifier for this claim — cannot request doctor approval.',
          ),
        );
      }

      const result = isEmergency
        ? await sendDoctorPreauthRequest({
            kind: 'emergency',
            consentToken: item.authorization_code,
            interventionCode: item.intervention_code,
            identificationNumber: doctor.identification_number,
            identificationType: doctor.identification_type,
            regulationBody: doctor.regulation_body,
            emergencyClaimId: resolvedEmergencyClaimId!,
          })
        : await sendDoctorPreauthRequest({
            kind: 'preauth',
            consentToken: item.authorization_code,
            interventionCode: item.intervention_code,
            practitionerRegistrationNumber: doctor.identification_number,
          });

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
