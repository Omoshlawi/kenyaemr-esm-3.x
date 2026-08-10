import React from 'react';
import { Button, InlineLoading, InlineNotification, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { EmtCase } from '../../types';
import ProviderSelectionStep from './provider-selection-step.component';
import OtpVerificationStep from './otp-verification-step.component';
import { OTP_LENGTH, useAcceptCase } from './use-accept-case';

type ReferraLDetailProps = {
  item: EmtCase;
  onClose?: () => void;
};

const AcceptCaseDetailModal: React.FC<ReferraLDetailProps> = ({ item: referralDetail, onClose }) => {
  const { t } = useTranslation();
  const {
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
  } = useAcceptCase({ referralDetail, onClose });

  return (
    <>
      <ModalHeader title={t('acceptCase', 'Accept Case')} closeModal={onClose} />
      <ModalBody>
        {error && <InlineNotification lowContrast={true} kind={errorKind} title={errorTitle} subtitle={error} />}
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
