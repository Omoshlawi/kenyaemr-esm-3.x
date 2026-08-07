import { Button, InlineLoading, InlineNotification, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmtCase } from '../../types';
import { initiateHandoverConcent, submitHandoverConcent, type Provider } from '../refferals.resource';
import ProviderSelectionStep from './provider-selection-step.component';
import { showSnackbar } from '@openmrs/esm-framework';
import OtpVerificationStep from './otp-verification-step.component';

type ReferraLDetailProps = {
  item: EmtCase;
  onClose?: () => void;
};

const OTP_LENGTH = 5;
const AcceptCaseDetailModal: React.FC<ReferraLDetailProps> = ({ item: referralDetail, onClose }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'provider' | 'otp'>('provider');
  const [provider, setProvider] = useState<Provider | undefined>(undefined);
  const [isInitiating, setInitiating] = useState(false);
  const [isVerifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [emtCase, setEmtCase] = useState<EmtCase>(referralDetail);
  const [error, setError] = useState('');
  const handleInitiate = async () => {
    setInitiating(true);
    try {
      setError('');
      // Call the API to initiate the referral
      const _case = await initiateHandoverConcent(provider!.uuid, referralDetail!.caseNumber);
      setEmtCase(_case?.data);
      setStep('otp');
    } catch (error) {
      setError(error?.responseBody?.message || t('unknownError', 'An unknown error occurred'));
      showSnackbar({
        title: t('errorInitiatingReferral', 'Error initiating referral'),
        subtitle: error?.message || t('unknownError', 'An unknown error occurred'),
        kind: 'error',
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
      // Call the API to verify the referral
      await submitHandoverConcent(referralDetail!.caseNumber, otp);
      showSnackbar({
        title: t('success', 'Success'),
        subtitle: t('referralAcceptedSuccessfully', 'Referral accepted successfully'),
        kind: 'success',
        isLowContrast: true,
      });
      onClose?.();
    } catch (error) {
      setError(error?.responseBody?.message || t('unknownError', 'An unknown error occurred'));
      showSnackbar({
        title: t('errorVerifyingReferral', 'Error verifying referral'),
        subtitle: error?.message || t('unknownError', 'An unknown error occurred'),
        kind: 'error',
        isLowContrast: true,
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <ModalHeader title={t('acceptCase', 'Accept Case')} closeModal={onClose} />
      <ModalBody>
        {error && <InlineNotification title={t('error', 'Error')} subtitle={error} />}
        {step === 'provider' ? (
          <ProviderSelectionStep provider={provider} setProvider={setProvider} />
        ) : (
          <OtpVerificationStep otp={otp} setOtp={setOtp} emtCase={emtCase} length={OTP_LENGTH} />
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('close', 'Close')}
        </Button>
        {step === 'provider' ? (
          <Button kind="primary" onClick={handleInitiate} disabled={!provider || isInitiating}>
            {isInitiating ? <InlineLoading /> : t('requestOtp', 'Request OTP')}
          </Button>
        ) : (
          <Button kind="primary" onClick={handleVerify} disabled={otp.length !== OTP_LENGTH || isVerifying}>
            {isVerifying ? <InlineLoading /> : t('verifyAndAccept', 'Verify and Accept')}
          </Button>
        )}
      </ModalFooter>
    </>
  );
};

export default AcceptCaseDetailModal;
