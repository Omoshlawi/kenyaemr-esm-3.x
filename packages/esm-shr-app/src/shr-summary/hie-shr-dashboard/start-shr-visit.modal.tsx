import React, { useMemo } from 'react';
import {
  Button,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  RadioButton,
  RadioButtonGroup,
  TextInput,
  Toggle,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import OtpInput from 'react-otp-input';
import ProviderSelectionStep from '../../referrals/referral-modals/provider-selection-step.component';
import { OTP_LENGTH, useStartShrVisit } from './use-start-shr-visit';
import styles from './hie-shr-dashboard.scss';

type StartShrVisitModalProps = {
  patientUuid: string;
  patientName?: string;
  onSuccess: () => void;
  closeModal?: () => void;
};

const StartShrVisitModal: React.FC<StartShrVisitModalProps> = ({ patientUuid, patientName, onSuccess, closeModal }) => {
  const { t } = useTranslation();
  const {
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
    isRequesting,
    isVerifying,
    isResending,
    error,
    handleRequestConsent,
    handleVerifyOtp,
    handleResendOtp,
  } = useStartShrVisit({ patientUuid, onSuccess, onClose: closeModal });

  const otpContainerStyle = useMemo(
    () => ({
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      alignItems: 'center',
    }),
    [],
  );

  const canRequest = Boolean(provider) && !isRequesting;
  const canVerify = otp.length === OTP_LENGTH && !isVerifying;
  const requestButtonLabel = isEmergency
    ? t('startEmergencyVisit', 'Start emergency visit')
    : t('sendOtpAndContinue', 'Send OTP');

  return (
    <>
      <ModalHeader
        title={t('startShrVisit', 'Start SHR visit')}
        closeModal={closeModal}
        label={patientName ? t('patientConsent', 'Patient consent') : undefined}
      />
      <ModalBody>
        {error && (
          <InlineNotification
            className={styles.notification}
            lowContrast
            kind="error"
            title={t('error', 'Error')}
            subtitle={error}
            onCloseButtonClick={() => undefined}
          />
        )}

        {step === 'details' ? (
          <div className={styles.formStack}>
            <p className={styles.helperText}>
              {t(
                'startShrVisitDescription',
                "Request patient consent to open an SHR visit. An OTP will be sent to the patient's registered phone number.",
              )}
            </p>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>{t('visitType', 'Visit type')}</legend>
              <RadioButtonGroup
                name="shr-visit-type"
                orientation="horizontal"
                valueSelected={visitType}
                onChange={(value) => {
                  if (value === 'IP' || value === 'OP') {
                    setVisitType(value);
                  }
                }}>
                <RadioButton id="visit-type-op" labelText={t('outpatient', 'Outpatient (OP)')} value="OP" />
                <RadioButton id="visit-type-ip" labelText={t('inpatient', 'Inpatient (IP)')} value="IP" />
              </RadioButtonGroup>
            </fieldset>

            <ProviderSelectionStep provider={provider} setProvider={setProvider} />

            <Toggle
              id="shr-emergency-consent"
              labelText={t('emergencyConsent', 'Emergency consent (skip OTP)')}
              labelA={t('no', 'No')}
              labelB={t('yes', 'Yes')}
              toggled={isEmergency}
              onToggle={setIsEmergency}
            />

            {isEmergency && (
              <div className={styles.formStack}>
                <p className={styles.helperText}>
                  {t(
                    'emergencyConsentHelp',
                    'Use only when the patient cannot provide OTP consent. The attending practitioner consents on their behalf.',
                  )}
                </p>
                <TextInput
                  id="incapacity-reason"
                  labelText={t('incapacityReason', 'Incapacity reason')}
                  placeholder={t('incapacityReasonPlaceholder', 'e.g. Unconscious patient')}
                  value={incapacityReason}
                  onChange={(event) => setIncapacityReason(event.target.value)}
                />
                <TextInput
                  id="representative-relationship"
                  labelText={t('representativeRelationship', 'Representative relationship')}
                  placeholder={t('representativeRelationshipPlaceholder', 'e.g. Healthcare Proxy')}
                  value={representativeRelationship}
                  onChange={(event) => setRepresentativeRelationship(event.target.value)}
                />
              </div>
            )}
          </div>
        ) : (
          <div className={styles.formStack}>
            <p className={styles.helperText}>
              {t(
                'enterOtpHelp',
                "Enter the one-time password sent to the patient's registered contact to confirm consent and open the SHR visit.",
              )}
            </p>
            <OtpInput
              value={otp}
              onChange={setOtp}
              numInputs={OTP_LENGTH}
              inputType="password"
              renderInput={(props) => <input {...props} className={styles.otpInput} />}
              renderSeparator={<span className={styles.otpSeparator}>-</span>}
              containerStyle={otpContainerStyle}
              skipDefaultStyles
              shouldAutoFocus
              placeholder="*"
            />
            <Button kind="ghost" size="sm" onClick={handleResendOtp} disabled={isResending}>
              {isResending ? (
                <InlineLoading description={t('resending', 'Resending...')} />
              ) : (
                t('resendOtp', 'Resend OTP')
              )}
            </Button>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        {step === 'details' ? (
          <Button kind="primary" onClick={handleRequestConsent} disabled={!canRequest}>
            {isRequesting ? <InlineLoading description={t('requesting', 'Requesting...')} /> : requestButtonLabel}
          </Button>
        ) : (
          <Button kind="primary" onClick={handleVerifyOtp} disabled={!canVerify}>
            {isVerifying ? (
              <InlineLoading description={t('verifying', 'Verifying...')} />
            ) : (
              t('verifyAndStartVisit', 'Verify and start visit')
            )}
          </Button>
        )}
      </ModalFooter>
    </>
  );
};

export default StartShrVisitModal;
