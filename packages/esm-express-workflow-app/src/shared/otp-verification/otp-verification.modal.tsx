import {
  Button,
  ButtonSet,
  Dropdown,
  FileUploader,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
  TextArea,
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
  ArrowLeft,
  Time,
} from '@carbon/react/icons';
import React, { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './otp-verification.scss';
import PinPut from '../pin-put/pinput.component';
import { PHONE_NUMBER_REGEX } from '../../constants';
import OTPCountdown from './pin-counter/pin-counter.component';
import { extractFetchError, maskPhoneNumber } from '../utils';

const MAX_VERIFY_ATTEMPTS = 3;
const BIOMETRIC_AUTO_CLOSE_MS = 1500;
const MIN_REASON_LENGTH = 10;

const WHITELIST_POLL_INTERVAL_MS = 5_000;
const WHITELIST_POLL_TIMEOUT_MS = 60_000;

const BIOMETRIC_POLL_INTERVAL_MS = 3_000;
const BIOMETRIC_POLL_TIMEOUT_MS = 3 * 60_000;

type Mode =
  | 'auth-landing'
  | 'landing'
  | 'verify-otp'
  | 'biometric'
  | 'biometric-failed'
  | 'whitelist-submit'
  | 'whitelist-waiting';

type WhitelistReason = {
  code: string;
  label: string;
  description: string;
  review_type: 'AUTOMATIC' | 'MANUAL';
  requires_attachments: boolean;
};

export type WhitelistPollResult = {
  is_whitelisted: boolean;
  has_pending: boolean;
  is_rejected?: boolean;
  latest_status: string | null;
  reviewer_note?: string | null;
};

type OTPVerificationModalProps = {
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

  authMode?: 'otp-only' | 'multi';
  whitelistedForOTP?: boolean;
  onStartBiometric?: () => Promise<{
    embed_url: string;
    authorization_code: string;
    consent_token: string;
    token: string;
    guid: string;
  }>;
  onBiometricSuccess?: (result: {
    authorization_code: string;
    consent_token: string;
    guid: string;
  }) => Promise<void> | void;
  onBiometricCancel?: (consentToken: string | null) => Promise<void> | void;
  onCheckBiometricStatus?: (token: string) => Promise<{
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    is_complete: boolean;
    is_approved: boolean;
    guid: string | null;
    authorization_code: string | null;
  }>;
  patientCRId?: string;

  whitelistReasons?: WhitelistReason[];

  onSubmitWhitelist?: (params: {
    reasonType: string;
    reason: string;
    biometricAttempts: number;
    attachment: File | null;
  }) => Promise<{ success: boolean; review_type?: string; error?: string }>;

  onCheckWhitelistStatus?: (crId: string) => Promise<WhitelistPollResult>;

  onRequestWhitelist?: () => void;

  onRejected?: () => void;
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
  onCheckBiometricStatus,
  patientCRId,
  whitelistReasons = [],
  onSubmitWhitelist,
  onCheckWhitelistStatus,
  onRequestWhitelist,
  onRejected,
  ekycOrigin,
}) => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState(phoneNumber);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{
    type: 'request' | 'verification' | 'biometric' | 'whitelist';
    message: string;
  } | null>(null);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState(phoneNumber);
  const [manualCheckLoading, setManualCheckLoading] = useState(false);

  const [countdownResetTrigger, setCountdownResetTrigger] = useState(0);
  const [isCountdownActive, setIsCountdownActive] = useState(false);

  const [failedVerifyCount, setFailedVerifyCount] = useState(0);
  const showEscapeHatch = failedVerifyCount >= MAX_VERIFY_ATTEMPTS;

  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricEmbedUrl, setBiometricEmbedUrl] = useState<string | null>(null);
  const biometricResultRef = useRef<{
    authorization_code: string;
    consent_token: string;
    token: string;
    guid: string;
  } | null>(null);
  const [whitelistReasonCode, setWhitelistReasonCode] = useState<string>('');
  const [whitelistReasonText, setWhitelistReasonText] = useState<string>('');
  const [whitelistBiometricAttempts, setWhitelistBiometricAttempts] = useState<number>(0);
  const [whitelistAttachment, setWhitelistAttachment] = useState<File | null>(null);
  const [whitelistSubmitting, setWhitelistSubmitting] = useState(false);
  const [checkingPendingRequest, setCheckingPendingRequest] = useState(false);

  const [whitelistReviewType, setWhitelistReviewType] = useState<string | null>(null);
  const [pollElapsedSec, setPollElapsedSec] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartTimeRef = useRef<number>(0);

  const [autoPollEnded, setAutoPollEnded] = useState(false);

  const [biometricPollElapsedSec, setBiometricPollElapsedSec] = useState(0);
  const [biometricFinalizing, setBiometricFinalizing] = useState(false);
  const [biometricRetrying, setBiometricRetrying] = useState(false);
  const biometricPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const biometricPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const biometricPollStartRef = useRef<number>(0);

  const [mode, setMode] = useState<Mode>(authMode === 'multi' ? 'auth-landing' : 'landing');

  const stopBiometricPolling = useCallback(() => {
    if (biometricPollIntervalRef.current) {
      clearInterval(biometricPollIntervalRef.current);
      biometricPollIntervalRef.current = null;
    }
    if (biometricPollTimeoutRef.current) {
      clearTimeout(biometricPollTimeoutRef.current);
      biometricPollTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      onCleanup?.();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
      if (biometricPollIntervalRef.current) {
        clearInterval(biometricPollIntervalRef.current);
      }
      if (biometricPollTimeoutRef.current) {
        clearTimeout(biometricPollTimeoutRef.current);
      }
    };
  }, [onCleanup]);

  const selectedReason = whitelistReasons.find((r) => r.code === whitelistReasonCode);
  const reasonRequiresAttachment = selectedReason?.requires_attachments ?? false;
  const pollElapsedDisplay = `${Math.floor(pollElapsedSec / 60)}:${String(pollElapsedSec % 60).padStart(2, '0')}`;
  const pollTotalDisplay = `${Math.floor(WHITELIST_POLL_TIMEOUT_MS / 60_000)}:00`;

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopPolling();
    stopBiometricPolling();
    if (biometricResultRef.current && (mode === 'biometric' || mode === 'biometric-failed')) {
      onBiometricCancel?.(biometricResultRef.current.consent_token);
    }
    onCleanup?.();
    onClose?.();
  }, [biometricResultRef, mode, onBiometricCancel, onCleanup, onClose, stopPolling, stopBiometricPolling]);

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
        token: result.token,
        guid: result.guid,
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

  const handleRetryBiometric = async () => {
    setError(null);
    setBiometricRetrying(true);
    try {
      if (biometricResultRef.current?.consent_token) {
        try {
          await onBiometricCancel?.(biometricResultRef.current.consent_token);
        } catch (rejectErr) {
          console.warn('Failed to reject previous biometric auth:', rejectErr);
        }
      }
      biometricResultRef.current = null;
      setBiometricEmbedUrl(null);
      await handleStartBiometric();
    } finally {
      setBiometricRetrying(false);
    }
  };
  useEffect(() => {
    if (mode !== 'biometric') {
      stopBiometricPolling();
      return;
    }

    const finalize = async (result: NonNullable<typeof biometricResultRef.current>) => {
      setBiometricFinalizing(true);
      try {
        await onBiometricSuccess?.(result);
        setTimeout(() => handleClose(), BIOMETRIC_AUTO_CLOSE_MS);
      } catch (err) {
        setError({
          type: 'biometric',
          message: extractFetchError(
            err,
            t('biometricVisitFailed', 'Biometric was approved but visit creation failed.'),
          ),
        });
        setMode('biometric-failed');
      } finally {
        setBiometricFinalizing(false);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (ekycOrigin && event.origin !== ekycOrigin) {
        return;
      }
      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }
      if (data.type !== 'EKYC_COMPLETE') {
        return;
      }

      if (data.status === 'SUCCESS' && biometricResultRef.current) {
        stopBiometricPolling();
        finalize(biometricResultRef.current).catch((err) => {
          console.warn('Biometric finalize (postMessage) failed:', err);
        });
      } else {
        stopBiometricPolling();
        setMode('biometric-failed');
      }
    };
    window.addEventListener('message', handleMessage);

    if (onCheckBiometricStatus && biometricResultRef.current?.token) {
      const token = biometricResultRef.current.token;
      biometricPollStartRef.current = Date.now();
      setBiometricPollElapsedSec(0);

      const doPoll = async () => {
        try {
          const status = await onCheckBiometricStatus(token);
          const elapsed = Math.floor((Date.now() - biometricPollStartRef.current) / 1000);
          setBiometricPollElapsedSec(elapsed);

          if (status.is_approved && biometricResultRef.current) {
            stopBiometricPolling();
            const refreshedGuid = status.guid ?? biometricResultRef.current.guid;
            await finalize({
              ...biometricResultRef.current,
              guid: refreshedGuid,
              authorization_code: status.authorization_code ?? biometricResultRef.current.authorization_code,
            });
            return;
          }
          if (status.status === 'REJECTED' || (status.is_complete && !status.is_approved)) {
            stopBiometricPolling();
            setError({
              type: 'biometric',
              message: t('biometricRejected', 'Biometric verification was rejected. You can try again or use OTP.'),
            });
            setMode('biometric-failed');
            return;
          }
        } catch (pollErr) {
          console.warn('Biometric status poll failed:', pollErr);
        }
      };
      const runPoll = () => {
        doPoll().catch((err) => {
          console.warn('Biometric poll wrapper error:', err);
        });
      };

      runPoll();
      biometricPollIntervalRef.current = setInterval(runPoll, BIOMETRIC_POLL_INTERVAL_MS);
      biometricPollTimeoutRef.current = setTimeout(() => {
        stopBiometricPolling();
        setError({
          type: 'biometric',
          message: t('biometricTimeout', 'Biometric verification did not complete in time. Please try again.'),
        });
        setMode('biometric-failed');
      }, BIOMETRIC_POLL_TIMEOUT_MS);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      stopBiometricPolling();
    };
  }, [mode, ekycOrigin, onBiometricSuccess, onCheckBiometricStatus, handleClose, stopBiometricPolling, t]);

  const checkWhitelistStatusOnce = useCallback(
    async (opts?: { manual?: boolean }) => {
      if (!patientCRId || !onCheckWhitelistStatus) {
        return;
      }
      if (opts?.manual) {
        setManualCheckLoading(true);
      }
      try {
        const status = await onCheckWhitelistStatus(patientCRId);
        const elapsed = Math.floor((Date.now() - pollStartTimeRef.current) / 1000);
        setPollElapsedSec(elapsed);

        if (status.is_whitelisted) {
          stopPolling();
          setError(null);
          setMode('landing');
          return;
        }

        if (status.is_rejected) {
          stopPolling();
          setError({
            type: 'whitelist',
            message:
              status.reviewer_note?.trim() ||
              t(
                'whitelistRejected',
                'The whitelist request was rejected by SHA. You may submit a new request or use biometrics.',
              ),
          });
          setMode('biometric-failed');
          return;
        }

        if (opts?.manual && !status.is_whitelisted && !status.is_rejected) {
          setError({
            type: 'whitelist',
            message: t(
              'whitelistStillPendingShort',
              'Request is still pending review. We will keep checking automatically.',
            ),
          });
        }
      } catch (pollErr) {
        if (opts?.manual) {
          setError({
            type: 'whitelist',
            message: extractFetchError(pollErr, t('whitelistCheckFailed', 'Status check failed. Please try again.')),
          });
        } else {
          console.warn('Whitelist status poll failed:', pollErr);
        }
      } finally {
        if (opts?.manual) {
          setManualCheckLoading(false);
        }
      }
    },
    [patientCRId, onCheckWhitelistStatus, stopPolling, t],
  );

  const startPollingWhitelistStatus = useCallback(() => {
    if (!patientCRId || !onCheckWhitelistStatus) {
      return;
    }

    pollStartTimeRef.current = Date.now();
    setPollElapsedSec(0);
    setAutoPollEnded(false);

    checkWhitelistStatusOnce();
    pollIntervalRef.current = setInterval(() => checkWhitelistStatusOnce(), WHITELIST_POLL_INTERVAL_MS);

    pollTimeoutRef.current = setTimeout(() => {
      stopPolling();
      setAutoPollEnded(true);
    }, WHITELIST_POLL_TIMEOUT_MS);
  }, [patientCRId, onCheckWhitelistStatus, checkWhitelistStatusOnce, stopPolling]);

  const handleOpenWhitelistFlow = useCallback(async () => {
    if (!patientCRId || !onSubmitWhitelist || whitelistReasons.length === 0) {
      onRequestWhitelist?.();
      handleClose();
      return;
    }

    setError(null);

    if (onCheckWhitelistStatus) {
      try {
        setCheckingPendingRequest(true);
        const status = await onCheckWhitelistStatus(patientCRId);

        if (status.is_whitelisted) {
          setMode('landing');
          return;
        }

        if (status.has_pending && !status.is_rejected) {
          setWhitelistReviewType(null);
          setMode('whitelist-waiting');
          startPollingWhitelistStatus();
          return;
        }
      } catch (err) {
        // Non-fatal: if the status check fails, fall through to the submission form
        console.warn('Pending whitelist status check failed; opening submission form:', err);
      } finally {
        setCheckingPendingRequest(false);
      }
    }

    setWhitelistReasonCode('');
    setWhitelistReasonText('');
    setWhitelistBiometricAttempts(0);
    setWhitelistAttachment(null);
    setMode('whitelist-submit');
  }, [
    patientCRId,
    onSubmitWhitelist,
    whitelistReasons,
    onCheckWhitelistStatus,
    onRequestWhitelist,
    handleClose,
    startPollingWhitelistStatus,
  ]);

  const handleSubmitWhitelist = async () => {
    if (!onSubmitWhitelist) {
      return;
    }
    setError(null);

    if (!whitelistReasonCode) {
      setError({ type: 'whitelist', message: t('whitelistReasonRequired', 'Please select a reason.') });
      return;
    }
    if (whitelistReasonText.trim().length < MIN_REASON_LENGTH) {
      setError({
        type: 'whitelist',
        message: t('whitelistReasonTooShort', 'Justification must be at least {{min}} characters.', {
          min: MIN_REASON_LENGTH,
        }),
      });
      return;
    }
    if (reasonRequiresAttachment && !whitelistAttachment) {
      setError({
        type: 'whitelist',
        message: t('whitelistAttachmentRequired', 'This reason requires an attachment (e.g. medical report).'),
      });
      return;
    }
    if (whitelistAttachment && whitelistAttachment.size === 0) {
      setError({
        type: 'whitelist',
        message: t('whitelistAttachmentEmpty', 'The selected file is empty. Please re-select it.'),
      });
      return;
    }

    setWhitelistSubmitting(true);
    try {
      const result = await onSubmitWhitelist({
        reasonType: whitelistReasonCode,
        reason: whitelistReasonText.trim(),
        biometricAttempts: whitelistBiometricAttempts,
        attachment: whitelistAttachment,
      });
      if (!result.success) {
        throw new Error(result.error ?? t('whitelistSubmitFailed', 'Whitelist submission failed.'));
      }

      setWhitelistReviewType(result.review_type ?? null);
      setMode('whitelist-waiting');
      startPollingWhitelistStatus();
    } catch (err) {
      setError({
        type: 'whitelist',
        message: extractFetchError(err, t('whitelistSubmitFailed', 'Whitelist submission failed.')),
      });
    } finally {
      setWhitelistSubmitting(false);
    }
  };

  const handleCancelWhitelistWaiting = () => {
    stopPolling();
    handleClose();
  };

  const handleSwitchToOtpFromAuthLanding = () => {
    setMode('landing');
  };

  const handleEscapeHatchFromVerifyOtp = () => {
    if (whitelistedForOTP) {
      setOtp('');
      setIsCountdownActive(false);
      setMode('auth-landing');
    } else {
      handleOpenWhitelistFlow();
    }
  };

  const handleBackFromWhitelist = () => {
    setError(null);
    setMode('auth-landing');
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

  const handleAttachmentChange = useCallback(
    (event: any) => {
      const fromAddedFiles: File[] = Array.isArray(event?.addedFiles) ? event.addedFiles : [];
      const fromTargetFiles: File[] = event?.target?.files ? Array.from(event.target.files as FileList) : [];
      const candidates = fromAddedFiles.length > 0 ? fromAddedFiles : fromTargetFiles;

      const file = candidates.find((f) => f && f.size > 0) ?? null;

      if (file) {
        setError(null);
        setWhitelistAttachment(file);
        return;
      }

      if (candidates.length > 0) {
        setWhitelistAttachment(null);
        setError({
          type: 'whitelist',
          message: t('whitelistAttachmentEmpty', 'The selected file appears to be empty. Please re-select it.'),
        });
        return;
      }
      setWhitelistAttachment(null);
    },
    [t],
  );
  const isValidPhoneNumber = (phone: string) => PHONE_NUMBER_REGEX.test(phone);

  const headerTitle = (() => {
    switch (mode) {
      case 'auth-landing':
        return t('secureAuthTitle', 'Secure Patient Authentication');
      case 'biometric':
        return t('biometricCaptureTitle', 'Biometric capture');
      case 'biometric-failed':
        return t('secureAuthBiometricFailedTitle', 'Biometric Verification Failed');
      case 'whitelist-submit':
        return t('whitelistRequestTitle', 'Request OTP Whitelisting');
      case 'whitelist-waiting':
        return t('whitelistWaitingTitle', 'Waiting for whitelist approval');
      default:
        return t('otpVerification', 'OTP Verification');
    }
  })();

  const headerEyebrow =
    mode === 'auth-landing' ||
    mode === 'biometric-failed' ||
    mode === 'whitelist-submit' ||
    mode === 'whitelist-waiting'
      ? t('secureAuthEyebrow', 'Biometrics or OTP')
      : null;

  const reasonItems = whitelistReasons.map((r) => ({
    id: r.code,
    label: r.label,
    description: r.description,
    review_type: r.review_type,
    requires_attachments: r.requires_attachments,
  }));

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
              kind={error.type === 'verification' ? 'warning' : 'error'}
              title={
                error.type === 'request'
                  ? t('otpRequestError', 'Error requesting OTP')
                  : error.type === 'biometric'
                  ? t('biometricError', 'Biometric error')
                  : error.type === 'whitelist'
                  ? t('whitelistError', 'Whitelist submission error')
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
                <button
                  className={styles.whitelistLink}
                  onClick={handleOpenWhitelistFlow}
                  disabled={checkingPendingRequest}>
                  {checkingPendingRequest ? (
                    <InlineLoading description={t('checkingExistingRequest', 'Checking existing requests…')} />
                  ) : (
                    <>
                      <RuleLocked size={16} />
                      <span>{t('btnRequestOtpWhitelisting', 'Request OTP Whitelisting')}</span>
                    </>
                  )}
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
                  onClick={handleEscapeHatchFromVerifyOtp}
                  disabled={checkingPendingRequest}>
                  {checkingPendingRequest ? (
                    <InlineLoading description={t('checkingExistingRequest', 'Checking existing requests…')} />
                  ) : whitelistedForOTP ? (
                    t('switchToBiometric', 'Switch to biometric')
                  ) : (
                    t('btnRequestOtpWhitelisting', 'Request OTP Whitelisting')
                  )}
                </Button>
              </div>
            )}
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
            <div className={styles.whitelistPollProgress}>
              <InlineLoading
                description={
                  biometricFinalizing
                    ? t('biometricCreatingVisit', 'Verified — creating visit…')
                    : t('biometricWaitingForApproval', 'Waiting for SHA to confirm capture…')
                }
                status="active"
              />
            </div>
            <span className={styles.whitelistPollTimer}>
              {Math.floor(biometricPollElapsedSec / 60)}:{String(biometricPollElapsedSec % 60).padStart(2, '0')} /{' '}
              {Math.floor(BIOMETRIC_POLL_TIMEOUT_MS / 60_000)}:00
            </span>
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
              <button className={styles.methodCard} onClick={handleOpenWhitelistFlow} disabled={checkingPendingRequest}>
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
                {checkingPendingRequest ? <InlineLoading /> : <ChevronRight size={18} className={styles.methodArrow} />}
              </button>
            )}

            <Button
              kind="ghost"
              size="md"
              renderIcon={Renew}
              className={styles.tryAgainButton}
              onClick={handleRetryBiometric}
              disabled={biometricRetrying || biometricLoading}>
              {biometricRetrying || biometricLoading ? (
                <InlineLoading description={t('biometricRetrying', 'Restarting…')} />
              ) : (
                t('tryBiometricsAgain', 'Try biometrics again')
              )}
            </Button>
          </div>
        )}

        {mode === 'whitelist-submit' && (
          <div className={styles.whitelistFormContainer}>
            <p className={styles.whitelistIntro}>
              {t(
                'whitelistFormIntro',
                'Submit a whitelist request so this patient can use OTP for the current visit. After approval, OTP will be sent automatically.',
              )}
            </p>
            <Dropdown
              id="whitelist-reason-type"
              titleText={t('whitelistReasonType', 'Reason')}
              label={t('whitelistReasonTypePlaceholder', 'Select a reason')}
              items={reasonItems}
              itemToString={(item) => (item ? item.label : '')}
              selectedItem={reasonItems.find((r) => r.id === whitelistReasonCode) ?? null}
              onChange={({ selectedItem }) => {
                setWhitelistReasonCode(selectedItem?.id ?? '');
                setWhitelistAttachment(null);
              }}
              disabled={whitelistSubmitting}
            />
            {selectedReason && (
              <div className={styles.whitelistReasonHint}>
                <p className={styles.whitelistReasonDesc}>{selectedReason.description}</p>
              </div>
            )}
            <TextArea
              id="whitelist-reason-text"
              labelText={t('whitelistJustification', 'Justification')}
              helperText={t(
                'whitelistJustificationHelper',
                'Explain why this patient cannot use biometric or OTP normally. Minimum {{min}} characters.',
                { min: MIN_REASON_LENGTH },
              )}
              value={whitelistReasonText}
              onChange={(ev) => setWhitelistReasonText(ev.target.value)}
              maxCount={500}
              enableCounter
              rows={4}
              disabled={whitelistSubmitting}
              invalid={whitelistReasonText.length > 0 && whitelistReasonText.trim().length < MIN_REASON_LENGTH}
              invalidText={t('whitelistJustificationTooShort', 'At least {{min}} characters required.', {
                min: MIN_REASON_LENGTH,
              })}
            />
            <NumberInput
              id="whitelist-biometric-attempts"
              label={t('biometricAttemptsLabel', 'Biometric attempts')}
              helperText={t(
                'biometricAttemptsHelper',
                'How many times biometric capture has been attempted (use 0 if not applicable).',
              )}
              min={0}
              max={50}
              value={whitelistBiometricAttempts}
              onChange={(_ev, { value }) => {
                const n = typeof value === 'number' ? value : Number(value) || 0;
                setWhitelistBiometricAttempts(Math.max(0, n));
              }}
              disabled={whitelistSubmitting}
            />
            {reasonRequiresAttachment && (
              <FileUploader
                accept={['.pdf', '.jpg', '.jpeg', '.png']}
                buttonKind="tertiary"
                buttonLabel={
                  whitelistAttachment
                    ? t('replaceAttachment', 'Replace attachment')
                    : t('addAttachment', 'Add attachment')
                }
                filenameStatus="edit"
                labelDescription={t(
                  'attachmentRequiredDesc',
                  'Required for this reason. Attach a supporting document (PDF/JPG/PNG, max 5 MB).',
                )}
                labelTitle={t('attachment', 'Attachment')}
                multiple={false}
                onChange={handleAttachmentChange}
                onDelete={() => setWhitelistAttachment(null)}
                disabled={whitelistSubmitting}
              />
            )}
            <Button
              kind="ghost"
              onClick={handleBackFromWhitelist}
              renderIcon={ArrowLeft}
              size="md"
              className={styles.tryAgainButton}
              disabled={whitelistSubmitting}>
              {t('back', 'Back')}
            </Button>
          </div>
        )}

        {mode === 'whitelist-waiting' && (
          <div className={styles.whitelistWaitingContainer}>
            <div className={styles.whitelistWaitingIconWrap}>
              <Time size={32} />
            </div>
            <h3 className={styles.whitelistWaitingTitle}>
              {autoPollEnded
                ? t('whitelistManualCheckTitle', 'Check status manually')
                : whitelistReviewType === 'AUTOMATIC'
                ? t('whitelistAutoApprovalProcessing', 'Processing automatic approval…')
                : t('whitelistAwaitingManualReview', 'Awaiting manual review…')}
            </h3>
            <p className={styles.whitelistWaitingBody}>
              {autoPollEnded
                ? t(
                    'whitelistManualCheckBody',
                    'Automatic checking has stopped. Tap "Check status now" to see if the request has been approved, or cancel and retry check-in later.',
                  )
                : whitelistReviewType === 'AUTOMATIC'
                ? t(
                    'whitelistAutoApprovalBody',
                    'Your request was submitted. We are checking with SHA — this usually takes a few seconds. Once approved, OTP will be sent automatically.',
                  )
                : t(
                    'whitelistManualReviewBody',
                    'Your request is queued for manual review by SHA. We will keep checking. If you would rather try again later, you can cancel below.',
                  )}
            </p>

            {!autoPollEnded && (
              <>
                <div className={styles.whitelistPollProgress}>
                  <InlineLoading description={t('whitelistChecking', 'Checking status…')} status="active" />
                </div>
                <span className={styles.whitelistPollTimer}>
                  {pollElapsedDisplay} / {pollTotalDisplay}
                </span>
              </>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <ButtonSet className={styles.buttonSet}>
          {(mode === 'landing' || mode === 'whitelist-submit' || mode !== 'auth-landing') && (
            <Button kind="secondary" onClick={handleCancelWhitelistWaiting} className={styles.button}>
              {t('btnCancel', 'Cancel')}
            </Button>
          )}

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

          {mode === 'whitelist-submit' && (
            <Button
              kind="primary"
              onClick={handleSubmitWhitelist}
              className={styles.button}
              disabled={
                whitelistSubmitting ||
                !whitelistReasonCode ||
                whitelistReasonText.trim().length < MIN_REASON_LENGTH ||
                (reasonRequiresAttachment && (!whitelistAttachment || whitelistAttachment.size === 0))
              }>
              {whitelistSubmitting ? (
                <InlineLoading description={t('submittingWhitelist', 'Submitting…')} />
              ) : (
                t('submitWhitelist', 'Submit request')
              )}
            </Button>
          )}
          {mode === 'whitelist-waiting' && (
            <Button
              kind={autoPollEnded ? 'primary' : 'ghost'}
              size="md"
              renderIcon={Renew}
              onClick={() => checkWhitelistStatusOnce({ manual: true })}
              disabled={manualCheckLoading}
              className={styles.tryAgainButton}>
              {manualCheckLoading ? (
                <InlineLoading description={t('whitelistChecking', 'Checking status…')} />
              ) : (
                t('checkStatusNow', 'Check status now')
              )}
            </Button>
          )}
        </ButtonSet>
      </ModalFooter>
    </React.Fragment>
  );
};

export default OTPVerificationModal;
