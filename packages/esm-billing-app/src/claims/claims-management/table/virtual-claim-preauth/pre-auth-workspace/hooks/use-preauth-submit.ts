import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openmrsFetch, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import {
  type PreauthQueueItem,
  type SupplementaryScheme,
} from '../../../../../../billing-form/social-health-authority/type';
import { lockCover } from '../../../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { buildPreauthFormData, extractFetchError, handleQueueMutate } from '../../utils';
import { virtualClaimBaseUrl } from '../../constants';
import { formatCurrency } from '../../../../../../helpers/currency';
import { type PreauthFormData } from '../pre-auth-schema';

interface SubmitErrorResponse {
  success?: boolean;
  error?: string;
}

interface UsePreauthSubmitParams {
  item?: PreauthQueueItem;
  isElective: boolean;
  isResubmit: boolean;
  selectedScheme: SupplementaryScheme | null;
  requiredDoctorsCount: number;
  requiredPreauthDocs: string[];
  mutate?: () => void;
  onSuccess: () => void;
}

export function usePreauthSubmit({
  item,
  isElective,
  isResubmit,
  selectedScheme,
  requiredDoctorsCount,
  requiredPreauthDocs,
  mutate,
  onSuccess,
}: UsePreauthSubmitParams) {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const idempotencyKey = useMemo(
    () =>
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  const onSubmit = async (data: PreauthFormData) => {
    if (!item) {
      return;
    }
    setSubmitError(null);

    if (requiredDoctorsCount > 0) {
      const providedDoctorsCount = (data.doctors ?? []).length;
      if (providedDoctorsCount < requiredDoctorsCount) {
        setSubmitError(
          t(
            'peerReviewDoctorsRequired',
            'This intervention requires a peer review by {{required}} doctors. Add {{required}} doctors to enable submission.',
            { required: requiredDoctorsCount },
          ),
        );
        return;
      }
    }

    if (requiredPreauthDocs.length > 0) {
      const uploadedTypes = new Set((data.attachments ?? []).filter((a) => a.file != null).map((a) => a.document_type));
      const missing = requiredPreauthDocs.filter((dt) => !uploadedTypes.has(dt));
      if (missing.length > 0) {
        setSubmitError(
          t(
            'missingRequiredDocs',
            'Missing required document(s): {{types}}. SHA needs each of these uploaded before this preauth can be submitted.',
            { types: missing.map((m) => m.replace(/_/g, ' ')).join(', ') },
          ),
        );
        return;
      }
    }

    const tariffNumeric = item?.tariff != null ? Number(item.tariff) : null;
    const unitPriceFromForm = (data as { unit_price?: string }).unit_price;
    if (tariffNumeric != null && tariffNumeric > 0 && unitPriceFromForm && Number(unitPriceFromForm) > tariffNumeric) {
      setSubmitError(
        t('unitPriceExceedsTariffSubmit', 'Unit price cannot exceed the published tariff of KES {{tariff}}.', {
          tariff: formatCurrency(tariffNumeric),
        }),
      );
      return;
    }
    try {
      const principalCr = selectedScheme?.principalContributor?.crNumber;
      const policyNumber = selectedScheme?.policy?.number;
      if (selectedScheme && item?.authorization_code) {
        if (!principalCr || !policyNumber) {
          throw new Error(
            t(
              'coverMissingPolicyNumber',
              'The selected cover has no policy number from SHA it cannot be locked. Choose another cover or contact SHA.',
            ),
          );
        }
        const lockResult = await lockCover({
          consentToken: item.authorization_code,
          principalCrId: principalCr,
          policyNumber,
        });
        if (!lockResult.ok) {
          throw new Error(
            t('coverLockFailed', 'Cover lock failed: {{reason}}', {
              reason: lockResult.error ?? 'Unknown SHA error',
            }),
          );
        }
      }

      const formData = buildPreauthFormData(data, item, isElective);
      const response = await openmrsFetch<SubmitErrorResponse>(`${restBaseUrl}/virtualclaims/preauth/files`, {
        method: 'POST',
        body: formData,
        headers: { 'Idempotency-Key': idempotencyKey },
      });

      if (response?.data?.success === false) {
        throw new Error(response.data.error ?? t('submitFailed', 'Submission failed'));
      }

      showSnackbar({
        title: isResubmit ? t('preauthResubmitted', 'Preauth resubmitted') : t('preauthSubmitted', 'Preauth submitted'),
        subtitle: isElective
          ? t(
              'electivePreauthSubmittedSubtitle',
              'Elective preauth submitted to SHA for review. Status will update in the Scheduled tab.',
            )
          : t('preauthSubmittedSubtitle', 'Preauth submitted to SHA for review.'),
        kind: 'success',
      });

      handleQueueMutate(`${virtualClaimBaseUrl}/preauth-queue`);
      mutate?.();
      onSuccess();
    } catch (err: unknown) {
      const message = extractFetchError(err, t('submitFailed', 'Submission failed. Please try again.'));
      setSubmitError(message);
    }
  };

  return { onSubmit, submitError };
}
