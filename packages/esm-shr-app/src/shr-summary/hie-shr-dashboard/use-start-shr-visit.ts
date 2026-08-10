import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { type Provider } from '../../referrals/refferals.resource';
import {
  requestShrConsent,
  resendShrConsentOtp,
  type ShrConsent,
  type ShrVisitType,
  verifyShrConsentOtp,
} from '../shr-summary.resource';

export const OTP_LENGTH = 5;

type StartShrVisitStep = 'details' | 'otp';

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

type UseStartShrVisitArgs = {
  patientUuid: string;
  onSuccess: () => void;
  onClose?: () => void;
};

export function useStartShrVisit({ patientUuid, onSuccess, onClose }: UseStartShrVisitArgs) {
  const { t } = useTranslation();
  const [step, setStep] = useState<StartShrVisitStep>('details');
  const [provider, setProvider] = useState<Provider | undefined>();
  const [visitType, setVisitType] = useState<ShrVisitType>('OP');
  const [isEmergency, setIsEmergency] = useState(false);
  const [incapacityReason, setIncapacityReason] = useState('');
  const [representativeRelationship, setRepresentativeRelationship] = useState('Healthcare Proxy');
  const [otp, setOtp] = useState('');
  const [consent, setConsent] = useState<ShrConsent | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');

  const completeSuccessfully = useCallback(
    (message: string) => {
      showSnackbar({
        title: t('success', 'Success'),
        subtitle: message,
        kind: 'success',
        isLowContrast: true,
      });
      onSuccess();
      onClose?.();
    },
    [onClose, onSuccess, t],
  );

  const handleRequestConsent = useCallback(async () => {
    if (!provider?.uuid) {
      return;
    }

    setIsRequesting(true);
    setError('');
    try {
      const result = await requestShrConsent({
        patientUuid,
        practitionerUuid: provider.uuid,
        visitType,
        requestedBy: provider.display,
        emergency: isEmergency,
        incapacityReason: isEmergency ? incapacityReason.trim() || undefined : undefined,
        representativeRelationship: isEmergency ? representativeRelationship.trim() || undefined : undefined,
      });

      setConsent(result);

      if (result.consentGranted) {
        completeSuccessfully(
          t('shrVisitStarted', 'SHR visit started. Patient shared health records can now be accessed.'),
        );
        return;
      }

      setStep('otp');
      showSnackbar({
        title: t('otpSent', 'OTP sent'),
        subtitle: t(
          'otpSentMessage',
          'A one-time password was sent to the patient. Enter it below to confirm consent.',
        ),
        kind: 'success',
        isLowContrast: true,
      });
    } catch (err) {
      const message = getErrorMessage(err as ApiError, t('unknownError', 'An unknown error occurred'));
      setError(message);
      showSnackbar({
        title: t('errorRequestingConsent', 'Could not start SHR visit'),
        subtitle: message,
        kind: 'error',
        isLowContrast: true,
      });
    } finally {
      setIsRequesting(false);
    }
  }, [
    completeSuccessfully,
    incapacityReason,
    isEmergency,
    patientUuid,
    provider,
    representativeRelationship,
    t,
    visitType,
  ]);

  const handleVerifyOtp = useCallback(async () => {
    if (!consent?.consentId || otp.length !== OTP_LENGTH) {
      return;
    }

    setIsVerifying(true);
    setError('');
    try {
      await verifyShrConsentOtp(consent.consentId, otp);
      completeSuccessfully(
        t('shrConsentVerified', 'Patient consent verified. SHR visit is open and records can be accessed.'),
      );
    } catch (err) {
      const message = getErrorMessage(err as ApiError, t('authorizeFailed', 'Authorization failed'));
      setError(message);
      showSnackbar({
        title: t('errorVerifyingConsent', 'Could not verify OTP'),
        subtitle: message,
        kind: 'error',
        isLowContrast: true,
      });
    } finally {
      setIsVerifying(false);
    }
  }, [completeSuccessfully, consent?.consentId, otp, t]);

  const handleResendOtp = useCallback(async () => {
    if (!consent?.consentId) {
      return;
    }

    setIsResending(true);
    setError('');
    try {
      const result = await resendShrConsentOtp(consent.consentId);
      setConsent(result);
      setOtp('');
      showSnackbar({
        title: t('otpResent', 'OTP resent'),
        subtitle: t('otpResentMessage', 'A new one-time password was sent to the patient.'),
        kind: 'success',
        isLowContrast: true,
      });
    } catch (err) {
      const message = getErrorMessage(err as ApiError, t('otpFailed', 'Failed to send OTP'));
      setError(message);
      showSnackbar({
        title: t('errorResendingOtp', 'Could not resend OTP'),
        subtitle: message,
        kind: 'error',
        isLowContrast: true,
      });
    } finally {
      setIsResending(false);
    }
  }, [consent?.consentId, t]);

  return {
    step,
    provider,
    setProvider,
    visitType,
    setVisitType,
    isEmergency,
    setIsEmergency,
    incapacityReason,
    setIncapacityReason,
    representativeRelationship,
    setRepresentativeRelationship,
    otp,
    setOtp,
    consent,
    isRequesting,
    isVerifying,
    isResending,
    error,
    handleRequestConsent,
    handleVerifyOtp,
    handleResendOtp,
  };
}
