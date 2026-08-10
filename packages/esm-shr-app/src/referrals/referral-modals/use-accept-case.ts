import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { navigate, restBaseUrl, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { EmtCase } from '../../types';
import { ReferralConfigObject } from '../../config-schema';
import { serveEmtClient, initiateHandoverConcent, submitHandoverConcent, type Provider } from '../refferals.resource';
import { mutate } from 'swr';

export const OTP_LENGTH = 6;

type AcceptCaseStep = 'provider' | 'otp';

type ApiError = {
  message?: string;
  status?: number;
  response?: { status?: number };
  responseBody?: string | { message?: string; error?: { message?: string } };
};

const HTTP_CONFLICT = 409;

/**
 * Pulls the human-readable message the server sent back, preferring the parsed
 * `responseBody` (which carries the domain message such as "this ambulance case
 * is not ready for handover") over the framework's generic "Server responded
 * with 4xx" fallback.
 */
const getErrorMessage = (err: ApiError, fallback: string): string => {
  const { responseBody } = err;
  if (typeof responseBody === 'string' && responseBody.trim()) {
    return responseBody;
  }
  if (responseBody && typeof responseBody === 'object') {
    return responseBody.message || responseBody.error?.message || fallback;
  }
  return fallback;
};

const getStatus = (err: ApiError): number | undefined => err.status ?? err.response?.status;

// A 409 is a business-state conflict (e.g. the case isn't ready for handover),
// not a failure the user did anything wrong to cause — surface it as a warning.
const isConflict = (err: ApiError): boolean => getStatus(err) === HTTP_CONFLICT;

type UseAcceptCaseArgs = {
  referralDetail: EmtCase;
  onClose?: () => void;
};

/**
 * Encapsulates the business logic for accepting an EMT case: requesting an OTP,
 * verifying the handover consent and — once accepted — registering a placeholder
 * patient keyed by the CR ID before navigating to their chart.
 *
 * Patient registration is treated as a step that is separate from the referral
 * acceptance, so a failure there is surfaced distinctly and does not roll back
 * the accepted referral.
 */
export function useAcceptCase({ referralDetail, onClose }: UseAcceptCaseArgs) {
  const { t } = useTranslation();
  const { registerPatientOnEmtCaseAcceptance } = useConfig<ReferralConfigObject>();
  const [step, setStep] = useState<AcceptCaseStep>('provider');
  const [provider, setProvider] = useState<Provider | undefined>(undefined);
  const [isInitiating, setInitiating] = useState(false);
  const [isVerifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [emtCase, setEmtCase] = useState<EmtCase>(referralDetail);
  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [errorKind, setErrorKind] = useState<'error' | 'warning'>('error');

  const handleInitiate = async () => {
    setInitiating(true);
    try {
      setError('');
      setErrorTitle('');
      setErrorKind('error');
      // Call the API to initiate the referral
      const _case = await initiateHandoverConcent(provider!.uuid, referralDetail!.caseNumber);
      setEmtCase(_case?.data);
      setStep('otp');
    } catch (err) {
      const initiateError = err as ApiError;
      const conflict = isConflict(initiateError);
      const message = getErrorMessage(initiateError, t('unknownError', 'An unknown error occurred'));
      const title = conflict
        ? t('caseNotReadyForHandover', 'Case not ready for handover')
        : t('errorInitiatingReferral', 'Error initiating referral');
      setError(message);
      setErrorTitle(title);
      setErrorKind(conflict ? 'warning' : 'error');
      showSnackbar({
        title,
        subtitle: message,
        kind: conflict ? 'warning' : 'error',
        isLowContrast: true,
      });
    } finally {
      setInitiating(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      setError('');
      setErrorTitle('');
      setErrorKind('error');
      // Call the API to verify the referral
      await submitHandoverConcent(referralDetail!.caseNumber, otp);
      mutate(
        (key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/kenyaemril/pull-emt-cases`),
        undefined,
        { revalidate: true },
      );
      showSnackbar({
        title: t('success', 'Success'),
        subtitle: t('referralAcceptedSuccessfully', 'Referral accepted successfully'),
        kind: 'success',
        isLowContrast: true,
      });
    } catch (err) {
      const verifyError = err as ApiError;
      const conflict = isConflict(verifyError);
      const message = getErrorMessage(verifyError, t('unknownError', 'An unknown error occurred'));
      const title = t('errorVerifyingReferral', 'Error verifying referral');
      setError(message);
      setErrorTitle(title);
      setErrorKind(conflict ? 'warning' : 'error');
      showSnackbar({
        title,
        subtitle: message,
        kind: conflict ? 'warning' : 'error',
        isLowContrast: true,
      });
      setVerifying(false);
      // Referral acceptance failed, so don't attempt patient registration.
      return;
    }

    // Patient registration on acceptance is optional and controlled by config.
    // When disabled, we stop after the referral has been accepted.
    if (!registerPatientOnEmtCaseAcceptance) {
      setVerifying(false);
      onClose?.();
      return;
    }

    // The referral has been accepted. Resolving the patient is a separate step,
    // so a failure here should not be reported as a failed acceptance. The server
    // registers a placeholder patient for the case, reusing an existing one when
    // the case's CR ID already resolves to a patient.
    try {
      const { uuid } = await serveEmtClient(referralDetail!.caseNumber);
      onClose?.();
      navigate({ to: window.getOpenmrsSpaBase() + `patient/${uuid}/chart/Patient Summary` });
    } catch (err) {
      const registrationError = err as ApiError;
      showSnackbar({
        title: t('errorRegisteringPatient', 'Referral accepted, but patient registration failed'),
        subtitle: getErrorMessage(
          registrationError,
          t(
            'patientRegistrationFailed',
            'The referral was accepted, but registering the patient could not be completed',
          ),
        ),
        kind: 'error',
        isLowContrast: true,
      });
      onClose?.();
    } finally {
      setVerifying(false);
    }
  };

  return {
    step,
    provider,
    setProvider,
    isInitiating,
    isVerifying,
    otp,
    setOtp,
    emtCase,
    error,
    errorTitle,
    errorKind,
    handleInitiate,
    handleVerify,
  };
}
