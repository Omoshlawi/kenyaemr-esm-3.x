import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showModal, showSnackbar, useSession, useVisit } from '@openmrs/esm-framework';
import { extractFetchError, extractUpstreamError } from '../../../shared/utils';
import styles from './end-visit-dialog.scss';
import { processVisitInsuranceClaim, sendDischargeOtp, submitVisitClaim } from './end-visit.resource';
import {
  checkBiometricAuthorizationStatus,
  createSHABiometricAuthorize,
  detectAuthorizingDeviceOS,
  fetchWhitelistStatus,
  rejectBiometricAuthorization,
  submitOtpWhitelist,
  useBiometricAgentStatus,
  useBiometricConfig,
  useOtpWhitelistReasons,
  usePatientCRId,
  usePatientPhone,
  usePatientWhitelistStatus,
  useProviderNationalId,
} from './sha-end-visit.resource';
import { DISCHARGE_REASONS } from '../type';

interface EndVisitDialogProps {
  patientUuid: string;
  closeModal: () => void;
}

const EndVisitDialog: React.FC<EndVisitDialogProps> = ({ patientUuid, closeModal }) => {
  const { t } = useTranslation();
  const { activeVisit } = useVisit(patientUuid);
  const [step, setStep] = useState<'confirm' | 'discharge-reason'>('confirm');
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const [reason, setReason] = useState('');
  const processingClaimRef = useRef(false);
  const serviceTypeRef = useRef('OUTPATIENT');
  const consentTokenRef = useRef<string>('');
  const invoiceNumberRef = useRef<string>('');
  const interventionsRef = useRef<string[]>([]);
  const phoneNumber = usePatientPhone(patientUuid);
  const patientCRId = usePatientCRId(patientUuid);
  const { isPatientWhiteListed } = usePatientWhitelistStatus(patientCRId);
  const { currentProvider } = useSession();
  const { providerNationalid } = useProviderNationalId(currentProvider?.uuid ?? '');
  const { agentUrl } = useBiometricConfig();
  const { workstationId } = useBiometricAgentStatus(agentUrl);
  const deviceOs = detectAuthorizingDeviceOS();
  const { reasons: whitelistReasons } = useOtpWhitelistReasons();

  const buildBiometricStarter = useCallback(
    (crId: string) => {
      return async () => {
        if (!providerNationalid) {
          throw new Error(
            t(
              'biometricMissingNationalId',
              'Provider National ID not configured. Please add it to your provider profile.',
            ),
          );
        }
        if (!workstationId) {
          throw new Error(
            t(
              'biometricAgentNotReachable',
              'Biometric agent not running. Please start the agent on this workstation and try again.',
            ),
          );
        }

        const res = await createSHABiometricAuthorize({
          agent_id: providerNationalid,
          patient_id: crId,
          interventions: interventionsRef.current,
          service_type: serviceTypeRef.current,
          workstation_id: workstationId,
          authorizing_device_os: deviceOs,
          patient_uuid: patientUuid,
        });
        if (!res.success || !res.embed_url || !res.token || !res.guid) {
          throw new Error(
            extractUpstreamError(res as any, t('biometricStartFailed', 'Could not start biometric session.')),
          );
        }
        return {
          embed_url: res.embed_url,
          authorization_code: res.authorization_code ?? '',
          consent_token: res.consent_token ?? res.token,
          token: res.token,
          guid: res.guid,
        };
      };
    },
    [providerNationalid, workstationId, deviceOs, patientUuid, t],
  );

  const handleSubmitWhitelist = useCallback(
    async (params: { reasonType: string; reason: string; biometricAttempts: number; attachment: File | null }) => {
      if (!patientCRId) {
        return { success: false, error: t('noCRNumber', 'Patient has no SHA CR number.') };
      }
      return submitOtpWhitelist({
        beneficiaryCrId: patientCRId,
        reasonType: params.reasonType,
        reason: params.reason,
        biometricAttempts: params.biometricAttempts,
        attachment: params.attachment,
      });
    },
    [patientCRId, t],
  );

  const handleCheckWhitelistStatus = useCallback(async (crId: string) => {
    const status = await fetchWhitelistStatus(crId);
    return {
      is_whitelisted: status.is_whitelisted,
      has_pending: status.has_pending,
      is_rejected: status.is_rejected,
      latest_status: status.latest_status,
      reviewer_note: status.requests?.[0]?.reviewer_note ?? null,
    };
  }, []);

  const handleEndVisit = async () => {
    if (!activeVisit || processingClaimRef.current) {
      return;
    }
    processingClaimRef.current = true;
    setIsProcessingClaim(true);

    try {
      const response = await processVisitInsuranceClaim(activeVisit.uuid);
      serviceTypeRef.current = response?.data?.service_type ?? 'OUTPATIENT';
      consentTokenRef.current = String(response?.data?.consentToken ?? '');
      invoiceNumberRef.current = String(response?.data?.invoiceNumber ?? '');
      interventionsRef.current = Array.isArray(response?.data?.intervention_codes)
        ? response?.data?.intervention_codes
        : [];
      setStep('discharge-reason');
    } catch (error) {
      showSnackbar({
        isLowContrast: true,
        kind: 'error',
        title: t('claimProcessingError', 'Error'),
        subtitle: extractFetchError(error, t('insuranceClaimProcessingFailed', 'Insurance claim processing failed')),
      });
      closeModal();
    } finally {
      processingClaimRef.current = false;
      setIsProcessingClaim(false);
    }
  };

  const handleContinue = useCallback(() => {
    if (!reason || !patientCRId || !activeVisit) {
      return;
    }

    closeModal();

    const crId = patientCRId;
    const visitUuid = activeVisit.uuid;
    const dischargeReason = reason;
    const invoiceNumber = invoiceNumberRef.current;
    let settled = false;

    const settle = (fn?: () => void) => {
      if (!settled) {
        settled = true;
        fn?.();
      }
    };

    setTimeout(() => {
      const dispose = showModal('otp-verification-modal', {
        onClose: () => {
          settle();
          dispose();
        },
        phoneNumber,
        otpLength: 6,
        expiryMinutes: 5,
        centerBoxes: true,
        authMode: 'multi',
        whitelistedForOTP: isPatientWhiteListed,
        patientCRId: crId,
        visitAction: 'end',

        onRequestOtp: async () => {
          const res = await sendDischargeOtp(crId, consentTokenRef.current);
          if (res.success === false) {
            throw new Error(res.error ?? t('otpRequestFailed', 'Failed to send OTP. Please try again.'));
          }
        },

        onVerify: async (otp: string) => {
          const res = await submitVisitClaim({ visitUuid, otp, dischargeReason, invoiceNumber });
          showSnackbar({
            isLowContrast: true,
            kind: res?.success === true ? 'success' : 'error',
            title: t('visitEnded', 'Visit ended'),
            subtitle: res?.message ?? res?.error ?? '',
          });
        },

        onVerificationSuccess: () => {
          settle(() => {
            dispose();
          });
        },

        onCleanup: () => {},

        onStartBiometric: buildBiometricStarter(crId),
        onCheckBiometricStatus: checkBiometricAuthorizationStatus,

        onBiometricSuccess: async (result: { authorization_code: string; consent_token: string; guid: string }) => {
          const res = await submitVisitClaim({
            visitUuid,
            dischargeAuthGuid: result.guid,
            dischargeReason,
            invoiceNumber,
          });
          showSnackbar({
            isLowContrast: true,
            kind: res?.success === true ? 'success' : 'error',
            title: t('visitEnded', 'Visit ended'),
            subtitle: res?.message ?? res?.error ?? '',
          });
        },

        onBiometricCancel: async (biometricConsentToken: string | null) => {
          if (biometricConsentToken) {
            try {
              await rejectBiometricAuthorization(biometricConsentToken);
            } catch (err) {
              console.warn('Failed to reject biometric auth:', err);
            }
          }
        },

        whitelistReasons,
        onSubmitWhitelist: handleSubmitWhitelist,
        onCheckWhitelistStatus: handleCheckWhitelistStatus,
      });
    }, 300);
  }, [
    reason,
    patientCRId,
    activeVisit,
    closeModal,
    phoneNumber,
    isPatientWhiteListed,
    buildBiometricStarter,
    whitelistReasons,
    handleSubmitWhitelist,
    handleCheckWhitelistStatus,
    t,
  ]);

  if (step === 'discharge-reason') {
    return (
      <div>
        <ModalHeader closeModal={closeModal} title={t('endVisitTitle', 'End Visit')} />
        <ModalBody className={styles.dischargeModalBody}>
          <p className={styles.bodyShort02}>
            {t(
              'dischargeReasonIntro',
              'Select the reason for ending this visit. You will then be asked to verify your identity.',
            )}
          </p>
          <Dropdown
            id="discharge-reason-dropdown"
            titleText={t('dischargeReason', 'Discharge reason')}
            label={t('selectDischargeReason', 'Select a reason')}
            items={[...DISCHARGE_REASONS]}
            itemToString={(item) => (item ? item.label : '')}
            selectedItem={DISCHARGE_REASONS.find((r) => r.id === reason) ?? null}
            onChange={({ selectedItem }) => setReason(selectedItem?.id ?? '')}
          />
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={closeModal}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" disabled={!reason} onClick={handleContinue}>
            {t('continue', 'Continue')}
          </Button>
        </ModalFooter>
      </div>
    );
  }

  return (
    <div>
      <ModalHeader
        closeModal={closeModal}
        title={t('endActiveVisitConfirmation', 'Are you sure you want to end this active visit?')}
      />
      <ModalBody>
        <p className={styles.bodyShort02}>
          {t('youWillProcessTheClaim', 'You will process the insurance claim for this visit.')}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" disabled={!activeVisit || isProcessingClaim} onClick={handleEndVisit}>
          {t('endVisit_title', 'End Visit')}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default EndVisitDialog;
