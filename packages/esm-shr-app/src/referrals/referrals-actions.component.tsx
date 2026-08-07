import React, { useCallback, useRef, useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';

import { useTranslation } from 'react-i18next';
import { navigate, showModal, showSnackbar } from '@openmrs/esm-framework';
import { ReferralReasonsProps } from '../types';
import { processCommunityReferral } from './refferals.resource';
import usePatient from '../hooks/usePatient';
import { sendSHAOtp, verifyOtp } from '../shr-summary/shr-summary.resource';

interface ReferralReasonData {
  referralData: ReferralReasonsProps;
  status: string;
  patientUuid: string;
}

const CommunityReferralActions: React.FC<ReferralReasonData> = ({ status, referralData, patientUuid }) => {
  const { t } = useTranslation();
  const idRef = useRef<string>();
  const [accessGranted, setAccessGranted] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const { error, isLoading, patientPhoneNumber, patientName, nationalId } = usePatient(patientUuid);

  const handleProcessReferral = useCallback(() => {
    processCommunityReferral(referralData.messageId)
      .then((res) => {
        showSnackbar({
          title: t('processReferral', 'Process referral'),
          subtitle: t('processReferralSuccess', 'Patient registered successfully'),
          kind: 'success',
          timeoutInMs: 3500,
          isLowContrast: true,
        });
        navigate({
          to: window.getOpenmrsSpaBase() + `patient/${res.data?.uuid}/chart/Patient Summary`,
        });
      })
      .catch((err) => {
        showSnackbar({
          title: t('processReferral', 'Process referral'),
          subtitle: t('processReferralError', 'Process referral error', { error: err.message }),
          kind: 'error',
          timeoutInMs: 3500,
          isLowContrast: true,
        });
      });
  }, [referralData, t]);

  const handleInitiateAuthorization = useCallback(() => {
    const dispose = showModal('otp-verification-modal', {
      onClose: () => {
        if (!accessGranted) {
          setIsAuthorizing(false);
        }
        dispose();
      },
      phoneNumber: patientPhoneNumber || '',
      otpLength: 5,
      expiryMinutes: 5,
      centerBoxes: true,
      onRequestOtp: async (_phone: string) => {
        const { status, id } = await sendSHAOtp(_phone, nationalId as string);
        idRef.current = id;
        if (status !== 'success') {
          throw new Error(t('otpFailed', 'Failed to send OTP'));
        }
      },

      onVerify: async (enteredOtp: string) => {
        const { status, data, error } = await verifyOtp(enteredOtp, idRef.current as string);
        if (status !== 'success') {
          throw new Error(t('authorizeFailed', 'Authorization failed'));
        }
      },

      onVerificationSuccess: () => {
        dispose();
        setIsAuthorizing(false);
        setAccessGranted(true);
        handleProcessReferral();
        showSnackbar({
          title: t('success', 'Success'),
          subtitle: t('otpVerificationSuccessMessage', 'OTP Vefification succesfull'),
          kind: 'success',
        });
      },

      onCleanup: () => {
        if (!accessGranted) {
          setIsAuthorizing(false);
        }
      },
    });
  }, [accessGranted, handleProcessReferral, nationalId, patientPhoneNumber, t]);

  const refearralReasonsHandleClick = useCallback(() => {
    const dispose = showModal('referral-reasons-dialog', {
      closeModal: () => dispose(),
      referralReasons: referralData,
      status: status,
      handleProcessReferral: handleInitiateAuthorization,
    });
  }, [referralData, handleInitiateAuthorization, status]);

  if (isLoading || isAuthorizing) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  return (
    <>
      <Button kind="primary" size="xs" onClick={refearralReasonsHandleClick}>
        {t('viewReasons', 'View reasons')}
      </Button>
      {status === 'completed' ? null : (
        <Button kind="primary" size="xs" onClick={handleInitiateAuthorization}>
          {t('serveClient', 'Serve client')}
        </Button>
      )}
    </>
  );
};
export default CommunityReferralActions;
