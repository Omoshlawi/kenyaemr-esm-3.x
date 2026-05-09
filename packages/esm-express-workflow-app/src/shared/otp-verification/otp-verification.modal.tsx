import {
  Button,
  ButtonSet,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
  IconButton,
} from '@carbon/react';
import {
  Phone,
  Edit,
  FingerprintRecognition,
  ChatBot,
  RuleLocked,
  Renew,
  ChevronRight,
  WarningAlt,
  CheckmarkFilled,
} from '@carbon/react/icons';
import React, { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './otp-verification.scss';
import PinPut from '../pin-put/pinput.component';
import { PHONE_NUMBER_REGEX } from '../../constants';
import OTPCountdown from './pin-counter/pin-counter.component';
import { extractFetchError, maskPhoneNumber } from '../utils';
import ShapeIndicator from '@carbon/react/lib/components/ShapeIndicator';

const MAX_VERIFY_ATTEMPTS = 3;
const BIOMETRIC_AUTO_CLOSE_MS = 1500;

type Mode =
  | 'auth-landing' // method picker (only shown when authMode='multi')
  | 'landing' // existing: confirm phone before sending OTP
  | 'verify-otp' // existing: enter OTP code
  | 'change-number' // existing: change phone number
  | 'biometric' // NEW: iframe capture
  | 'biometric-failed'; // NEW: post-failure recovery

type OTPVerificationModalProps = {
  // ── EXISTING PROPS (unchanged) ──
  onClose?: () => void;
  otpLength?: number;
  onVerify?: (otp: string) => Promise<void>;
  onVerificationSuccess?: () => void;
  obscureText?: boolean;
  centerBoxes?: boolean;
  phoneNumber: string;
  onRequestOtp?: (phoneNumber: string) => Promise<void>;
  expiryMinutes?: number;
  onCleanup?: () => void;

  // ── NEW PROPS (all optional — preserves backward compatibility) ──

  /** When true, shows the auth-landing method picker first (Biometric / OTP /
   *  Whitelist). When false or undefined, opens directly to the OTP landing
   *  (existing behavior). */
  authMode?: 'otp-only' | 'multi';

  /** Whether the patient is approved for OTP whitelist bypass. Drives the
   *  method picker layout and post-failure recovery options. */
  whitelistedForOTP?: boolean;

  /** Called when the user picks biometric. Should return a promise resolving
   *  with the embed_url + auth code from /biometric-authorize. */
  onStartBiometric?: () => Promise<{
    embed_url: string;
    authorization_code: string;
    consent_token: string;
  }>;

  /** Called on successful biometric capture (iframe postMessage SUCCESS). */
  onBiometricSuccess?: (result: { authorization_code: string; consent_token: string }) => void;

  /** Called when biometric session is cancelled (user closes, timer expires).
   *  Backend's /biometric-cancel goes here. */
  onBiometricCancel?: (consentToken: string | null) => void;

  /** Called when user clicks "Request whitelisting" — parent opens the
   *  whitelist submission modal. */
  onRequestWhitelist?: () => void;

  /** Called when user clicks "Reject" on the auth landing — visit proceeds
   *  without consent (administrative override). */
  onRejected?: () => void;

  /** eKYC iframe postMessage origin for security (defaults to
   */
  ekycOrigin?: string;
};

const OTPVerificationModal: FC<OTPVerificationModalProps> = ({
  onClose,
  onVerify,
  otpLength = 5,
  centerBoxes,
  obscureText,
  phoneNumber,
  onRequestOtp,
  onVerificationSuccess,
  expiryMinutes = 5,
  onCleanup,
  authMode = 'otp-only',
  whitelistedForOTP = false,
  onStartBiometric,
  onBiometricSuccess,
  onBiometricCancel,
  onRequestWhitelist,
  onRejected,
  ekycOrigin,
}) => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState(phoneNumber);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ type: 'request' | 'verification' | 'biometric'; message: string } | null>(null);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState(phoneNumber);

  const [countdownResetTrigger, setCountdownResetTrigger] = useState(0);
  const [isCountdownActive, setIsCountdownActive] = useState(false);

  const [failedVerifyCount, setFailedVerifyCount] = useState(0);
  const showEscapeHatch = failedVerifyCount >= MAX_VERIFY_ATTEMPTS;

  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricEmbedUrl, setBiometricEmbedUrl] = useState<string | null>(null);
  const biometricResultRef = useRef<{ authorization_code: string; consent_token: string } | null>(null);

  const [mode, setMode] = useState<Mode>(authMode === 'multi' ? 'auth-landing' : 'landing');

  useEffect(() => {
    return () => {
      onCleanup?.();
    };
  }, [onCleanup]);

  useEffect(() => {
    if (mode !== 'biometric') {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (ekycOrigin && event.origin !== ekycOrigin) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }
      if (data.type === 'EKYC_COMPLETE') {
        if (data.status === 'SUCCESS' && biometricResultRef.current) {
          onBiometricSuccess?.(biometricResultRef.current);
          setTimeout(() => handleClose(), BIOMETRIC_AUTO_CLOSE_MS);
        } else {
          setMode('biometric-failed');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mode, ekycOrigin, onBiometricSuccess]);

  const handleClose = useCallback(() => {
    if (biometricResultRef.current && (mode === 'biometric' || mode === 'biometric-failed')) {
      onBiometricCancel?.(biometricResultRef.current.consent_token);
    }
    onCleanup?.();
    onClose?.();
  }, [biometricResultRef, mode, onBiometricCancel, onCleanup, onClose]);

  const handleVerify = async () => {
    setError(null);
    try {
      setIsLoading(true);
      await onVerify?.(otp);
      onVerificationSuccess?.();
      setTimeout(() => handleClose(), 1000);
    } catch (err: unknown) {
      setFailedVerifyCount((n) => n + 1);
      setError({
        type: 'verification',
        message: extractFetchError(err, t('otpVerificationFailed', 'OTP verification failed. Please try again.')),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestingOtp = async (phone: string) => {
    setError(null);
    try {
      setRequestingOtp(true);
      await onRequestOtp?.(phone);

      setOtp('');
      setCurrentPhoneNumber(phone);
      setMode('verify-otp');
      setFailedVerifyCount(0);

      setIsCountdownActive(true);
      setCountdownResetTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      setError({
        type: 'request',
        message: extractFetchError(err, t('otpRequestFailed', 'Failed to send OTP. Please try again.')),
      });
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleStartBiometric = async () => {
    setError(null);
    setBiometricLoading(true);
    try {
      const result = await onStartBiometric?.();
      if (!result || !result.embed_url) {
        throw new Error(t('biometricNoEmbedUrl', 'Biometric session did not return an embed URL.'));
      }
      biometricResultRef.current = {
        authorization_code: result.authorization_code,
        consent_token: result.consent_token,
      };
      setBiometricEmbedUrl(result.embed_url);
      setMode('biometric');
    } catch (err) {
      setError({
        type: 'biometric',
        message: extractFetchError(err, t('biometricStartFailed', 'Could not start biometric session.')),
      });
      setMode('biometric-failed');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleRetryBiometric = () => {
    setError(null);
    biometricResultRef.current = null;
    setBiometricEmbedUrl(null);
    handleStartBiometric();
  };

  const handleRequestWhitelist = () => {
    onRequestWhitelist?.();
    handleClose();
  };

  const handleSwitchToOtpFromAuthLanding = () => {
    // Multi-mode → OTP picked → go through existing landing (confirm phone → send OTP)
    setMode('landing');
  };

  const handleEscapeHatchFromVerifyOtp = () => {
    // 3-strike escape hatch inside verify-otp.
    if (whitelistedForOTP) {
      // Patient has whitelist privilege → switch to biometric as alternative auth.
      setOtp('');
      setIsCountdownActive(false);
      setMode('auth-landing');
    } else {
      // Patient not whitelisted → request whitelisting (parent handles).
      handleRequestWhitelist();
    }
  };

  const handleUseDifferentNumber = () => {
    setOtp('');
    setIsCountdownActive(false);
    setNewPhoneNumber(currentPhoneNumber);
    setMode('change-number');
  };

  const handleBackToLanding = () => {
    setNewPhoneNumber(currentPhoneNumber);
    setMode('landing');
  };

  const handleCountdownExpired = () => {
    setError({
      type: 'verification',
      message: t('otpExpiredMessage', 'OTP has expired. Please request a new one.'),
    });
    setOtp('');
    setIsCountdownActive(false);
    setMode('landing');
  };

  const handleReject = () => {
    onRejected?.();
    handleClose();
  };

  const isValidPhoneNumber = (phone: string) => PHONE_NUMBER_REGEX.test(phone);

  // ── render ──

  const headerTitle = (() => {
    switch (mode) {
      case 'auth-landing':
        return t('secureAuthTitle', 'Secure Patient Authentication');
      case 'biometric':
        return t('biometricCaptureTitle', 'Biometric capture');
      case 'biometric-failed':
        return t('secureAuthBiometricFailedTitle', 'Biometric Verification Failed');
      default:
        return t('otpVerification', 'OTP Verification');
    }
  })();

  const headerEyebrow =
    mode === 'auth-landing' || mode === 'biometric-failed' ? t('secureAuthEyebrow', 'Biometrics or OTP') : null;

  return (
    <React.Fragment>
      <ModalHeader className={styles.sectionHeader} closeModal={handleClose}>
        {headerEyebrow && <p className={styles.eyebrow}>{headerEyebrow}</p>}
        {headerTitle}
      </ModalHeader>

      <ModalBody>
        {error && (
          <>
            <InlineNotification
              lowContrast
              kind={error.type === 'request' || error.type === 'biometric' ? 'error' : 'warning'}
              title={
                error.type === 'request'
                  ? t('otpRequestError', 'Error requesting OTP')
                  : error.type === 'biometric'
                  ? t('biometricError', 'Biometric error')
                  : t('otpVerificationError', 'Error verifying OTP')
              }
              subtitle={error.message}
            />
            <br />
          </>
        )}

        {mode === 'auth-landing' && (
          <div className={styles.authLandingContainer}>
            <p className={styles.authIntro}>
              {t(
                'secureAuthIntro',
                'To ensure the safety of your health records, please verify your identity using one of the following methods:',
              )}
            </p>

            <button className={styles.methodCard} onClick={handleStartBiometric} disabled={biometricLoading}>
              <div className={styles.methodIconWrap}>
                <FingerprintRecognition size={22} />
              </div>
              <div className={styles.methodContent}>
                <p className={styles.methodTitle}>{t('btnUseBiometrics', 'Use of Biometrics')}</p>
                <p className={styles.methodDesc}>
                  {t('secureAuthBiometricOption', 'Biometric authentication (fingerprint)')}
                </p>
              </div>
              {biometricLoading ? <InlineLoading /> : <ChevronRight size={18} className={styles.methodArrow} />}
            </button>

            <button
              className={`${styles.methodCard} ${!whitelistedForOTP ? styles.methodCardDisabled : ''}`}
              onClick={handleSwitchToOtpFromAuthLanding}
              disabled={!whitelistedForOTP}>
              <div className={`${styles.methodIconWrap} ${styles.methodIconWarning}`}>
                <ChatBot size={22} />
              </div>
              <div className={styles.methodContent}>
                <div className={styles.methodTitleRow}>
                  <p className={styles.methodTitle}>{t('btnUseOtp', 'Use OTP')}</p>
                  {!whitelistedForOTP && (
                    <span className={styles.badgeRequired}>{t('whitelistingRequired', 'Whitelisting required')}</span>
                  )}
                </div>
                <p className={styles.methodDesc}>
                  {t(
                    'secureAuthOtpOption',
                    'One-Time Password (Whitelisting is a must) sent to your registered phone number or email',
                  )}
                </p>
              </div>
              {whitelistedForOTP && <ChevronRight size={18} className={styles.methodArrow} />}
            </button>

            {!whitelistedForOTP && (
              <>
                <div className={styles.dividerWithText}>{t('or', 'or')}</div>
                <button className={styles.whitelistLink} onClick={handleRequestWhitelist}>
                  <RuleLocked size={16} />
                  <span>{t('btnRequestOtpWhitelisting', 'Request OTP Whitelisting')}</span>
                </button>
              </>
            )}

            <div className={styles.dataNotice}>
              <RuleLocked size={14} />
              <span>
                {t(
                  'secureAuthDataNotice',
                  'All authentication data is securely handled and used only for identity verification.',
                )}
              </span>
            </div>
          </div>
        )}

        {mode === 'landing' && (
          <div className={styles.otpTriggerContainer}>
            <p>{t('confirmationTxt', 'Verify the phone number before OTP')}</p>
            <div className={styles.phoneNumberDisplay}>
              <Phone className={styles.phoneIcon} />
              <span className={styles.phoneNumber}>
                {currentPhoneNumber ? maskPhoneNumber(currentPhoneNumber) : '—'}
              </span>
              <IconButton
                kind="ghost"
                size="sm"
                label={t('changePhoneNumber', 'Change phone number')}
                onClick={handleUseDifferentNumber}
                className={styles.editButton}>
                <Edit />
              </IconButton>
            </div>
            <div className={styles.expiryInfo}>
              <p className={styles.expiryText}>
                {t('otpExpiryInfo', 'The OTP will be valid for {{minutes}} minutes after it is sent.', {
                  minutes: expiryMinutes,
                })}
              </p>
            </div>
          </div>
        )}

        {mode === 'verify-otp' && (
          <div className={styles.otpInputContainer}>
            <div className={styles.otpInstruction}>
              {t('enterOtpSentTo', 'Enter the OTP code sent to')} <strong>{maskPhoneNumber(currentPhoneNumber)}</strong>
            </div>

            {isCountdownActive && (
              <div className={styles.countdownSection}>
                <OTPCountdown
                  expiryMinutes={expiryMinutes}
                  isActive={isCountdownActive}
                  resetTrigger={countdownResetTrigger}
                  onExpired={handleCountdownExpired}
                  variant="default"
                  showIcon={true}
                />
              </div>
            )}

            <PinPut
              value={otp}
              onChange={setOtp}
              numInputs={otpLength}
              centerBoxes={centerBoxes}
              obscureText={obscureText}
            />

            <Button kind="ghost" size="sm" className={styles.changeNumberLink} onClick={handleUseDifferentNumber}>
              {t('useADifferentNumber', 'Use a different number')}
            </Button>

            {showEscapeHatch && (
              <div className={styles.escapeHatch}>
                <InlineNotification
                  lowContrast
                  hideCloseButton
                  kind={whitelistedForOTP ? 'info' : 'warning'}
                  title={
                    whitelistedForOTP
                      ? t('otpFailedWhitelisted', 'OTP not working?')
                      : t('otpFailedRepeatedly', 'OTP failed 3 times')
                  }
                  subtitle={
                    whitelistedForOTP
                      ? t(
                          'otpFailedWhitelistedSubtitle',
                          'Try biometrics instead — biometric capture is available for whitelisted patients.',
                        )
                      : t(
                          'otpFailedNotWhitelistedSubtitle',
                          'Patient may not be receiving the SMS. Submit a whitelist request to bypass OTP for future visits.',
                        )
                  }
                />
                <Button
                  kind="ghost"
                  size="md"
                  className={styles.escapeHatchButton}
                  renderIcon={whitelistedForOTP ? FingerprintRecognition : RuleLocked}
                  onClick={handleEscapeHatchFromVerifyOtp}>
                  {whitelistedForOTP
                    ? t('switchToBiometric', 'Switch to biometric')
                    : t('btnRequestOtpWhitelisting', 'Request OTP Whitelisting')}
                </Button>
              </div>
            )}
          </div>
        )}

        {mode === 'change-number' && (
          <div className={styles.changeNumberContainer}>
            <TextInput
              id="otp-phone-number"
              labelText={t('phoneNumber', 'Phone number')}
              value={newPhoneNumber}
              onChange={(ev) => setNewPhoneNumber(ev.target.value)}
              placeholder={t('enterPhoneNumber', 'Enter phone number')}
              className={styles.phoneInput}
              invalid={newPhoneNumber.length > 0 && !isValidPhoneNumber(newPhoneNumber)}
              invalidText={t('invalidPhoneNumber', 'Please enter a valid phone number')}
            />
            <Button kind="ghost" size="sm" onClick={handleBackToLanding} className={styles.backButton}>
              {t('back', 'Back')}
            </Button>
          </div>
        )}

        {mode === 'biometric' && biometricEmbedUrl && (
          <div className={styles.biometricContainer}>
            <div className={styles.iframeWrapper}>
              <iframe
                src={biometricEmbedUrl}
                className={styles.biometricIframe}
                title={t('biometricCapture', 'Biometric capture')}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
            <p className={styles.biometricHint}>
              {t('biometricHint', 'Follow the on-screen instructions in the capture window.')}
            </p>
          </div>
        )}

        {mode === 'biometric-failed' && (
          <div className={styles.failedContainer}>
            <InlineNotification
              lowContrast
              hideCloseButton
              kind="error"
              title={t('secureAuthBiometricFailedTitle', 'Biometric Verification Failed')}
              subtitle={
                whitelistedForOTP
                  ? t(
                      'secureAuthBiometricFailedBodyWhitelisted',
                      'Please try again or use OTP verification to continue.',
                    )
                  : t(
                      'secureAuthBiometricFailedBody',
                      'Please try again or use OTP Whitelisting verification to continue.',
                    )
              }
            />

            <p className={styles.chooseLabel}>{t('secureAuthChooseReason', 'Choose an option')}</p>

            {whitelistedForOTP ? (
              <button className={styles.methodCard} onClick={handleSwitchToOtpFromAuthLanding}>
                <div className={`${styles.methodIconWrap} ${styles.methodIconWarning}`}>
                  <ChatBot size={22} />
                </div>
                <div className={styles.methodContent}>
                  <p className={styles.methodTitle}>{t('btnUseOtp', 'Use OTP')}</p>
                  <p className={styles.methodDesc}>
                    {t('useOtpDesc', "Send a One-Time Password to the patient's registered phone or email")}
                  </p>
                </div>
                <ChevronRight size={18} className={styles.methodArrow} />
              </button>
            ) : (
              <button className={styles.methodCard} onClick={handleRequestWhitelist}>
                <div className={`${styles.methodIconWrap} ${styles.methodIconWarning}`}>
                  <RuleLocked size={22} />
                </div>
                <div className={styles.methodContent}>
                  <p className={styles.methodTitle}>{t('btnRequestOtpWhitelisting', 'Request OTP Whitelisting')}</p>
                  <p className={styles.methodDesc}>
                    {t(
                      'requestWhitelistDesc',
                      'Submit a whitelisting request for this patient. Once approved, OTP can be used.',
                    )}
                  </p>
                </div>
                <ChevronRight size={18} className={styles.methodArrow} />
              </button>
            )}

            <Button
              kind="ghost"
              size="md"
              renderIcon={Renew}
              className={styles.tryAgainButton}
              onClick={handleRetryBiometric}>
              {t('tryBiometricsAgain', 'Try biometrics again')}
            </Button>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <ButtonSet className={styles.buttonSet}>
          {(mode === 'auth-landing' || mode === 'biometric-failed') && onRejected && (
            <Button kind="danger--ghost" onClick={handleReject} className={styles.button}>
              {t('btnReject', 'Reject')}
            </Button>
          )}

          <Button kind="secondary" onClick={handleClose} className={styles.button}>
            {t('btnCancel', 'Cancel')}
          </Button>

          {mode === 'landing' && (
            <Button
              kind="primary"
              size="lg"
              className={styles.sendOtpButton}
              disabled={requestingOtp}
              onClick={() => handleRequestingOtp(currentPhoneNumber)}>
              {requestingOtp ? (
                <InlineLoading description={t('sendingOtp', 'Sending OTP...')} />
              ) : error?.type === 'request' ? (
                t('resendOtp', 'Resend OTP')
              ) : (
                t('sendOtpCode', 'Send OTP Code')
              )}
            </Button>
          )}

          {mode === 'verify-otp' && (
            <Button
              disabled={isLoading || otp.length !== otpLength}
              kind="primary"
              onClick={handleVerify}
              className={styles.button}>
              {isLoading ? <InlineLoading description={t('verifyingOtp', 'Verifying OTP')} /> : t('verify', 'Verify')}
            </Button>
          )}

          {mode === 'change-number' && (
            <Button
              disabled={!isValidPhoneNumber(newPhoneNumber) || requestingOtp}
              kind="primary"
              onClick={() => handleRequestingOtp(newPhoneNumber)}
              className={styles.button}>
              {requestingOtp ? (
                <InlineLoading description={t('reSendingOtp', 'Resending OTP...')} />
              ) : (
                t('sendOtp', 'Send OTP')
              )}
            </Button>
          )}
        </ButtonSet>
      </ModalFooter>
    </React.Fragment>
  );
};

export default OTPVerificationModal;
