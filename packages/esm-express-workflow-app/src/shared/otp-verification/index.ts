import { showModal } from '@openmrs/esm-framework';
import { default as otpVerificationModal } from './otp-verification.modal';
import { type ModalSize } from '@carbon/react/lib/components/Modal/Modal';

/**
 * Result returned by onStartBiometric — the caller's `/biometric-authorize`
 * handler resolves with this shape so the modal knows the embed URL to render
 * and the auth code to round-trip on success.
 */
export type BiometricStartResult = {
  embed_url: string;
  authorization_code: string;
  consent_token: string;
};

/**
 * Result handed to onBiometricSuccess when the iframe's eKYC capture completes
 * successfully (postMessage from the eKYC origin).
 */
export type BiometricSuccessResult = {
  authorization_code: string;
  consent_token: string;
};

/**
 * Options for configuring the OTP / Secure Patient Authentication modal.
 *
 * The modal supports two operating modes:
 *
 * 1. **otp-only** (default, backward compatible) — opens directly into the
 *    existing OTP confirm-phone screen. Use this when the only auth path is OTP.
 *    All existing consumers don't need to change.
 *
 * 2. **multi** — opens an auth landing screen with three options: biometric,
 *    OTP, or whitelist request. The available options depend on `whitelistedForOTP`.
 *
 * @property {number} [otpLength] - The number of digits required for the OTP. Defaults to implementation-specific value.
 * @property {(otp: string) => Promise<void>} [onVerify] - Callback invoked when the user submits the OTP. Should return a promise that resolves on successful verification.
 * @property {boolean} [obscureText] - If true, the OTP input will be obscured (e.g., password-style input).
 * @property {boolean} [centerBoxes] - If true, OTP input boxes will be centered in the modal.
 * @property {string} phoneNumber - The phone number to which the OTP will be sent.
 * @property {(phoneNumber: string) => Promise<void>} [onRequestOtp] - Callback invoked to request a new OTP for the given phone number. Should return a promise.
 * @property {() => void} [onVerificationSuccess] - Callback invoked when OTP verification succeeds.
 * @property {number} [expiryMinutes] - The number of minutes after which the OTP expires. Defaults to 5 minutes. This is displayed to the user for clarity.
 * @property {() => void} [onCleanup] - Callback invoked when the modal closes to clean up OTP resources.
 *
 * @property {'otp-only' | 'multi'} [authMode] - When 'multi', shows the auth-landing method picker first (Biometric / OTP / Whitelist). When 'otp-only' or undefined, opens directly to the existing OTP landing.
 * @property {boolean} [whitelistedForOTP] - Whether the patient is approved for OTP whitelist bypass. Drives method picker layout and post-failure recovery options.
 * @property {() => Promise<BiometricStartResult>} [onStartBiometric] - Called when the user picks biometric. Should resolve with the embed_url + auth code from /biometric-authorize.
 * @property {(result: BiometricSuccessResult) => void} [onBiometricSuccess] - Called on successful biometric capture (iframe postMessage SUCCESS).
 * @property {(consentToken: string | null) => void} [onBiometricCancel] - Called when biometric session is cancelled (user closes, timer expires). Backend's /biometric-cancel goes here.
 * @property {() => void} [onRequestWhitelist] - Called when the user clicks "Request OTP Whitelisting" — parent should open the whitelist submission flow.
 * @property {() => void} [onRejected] - Called when the user clicks "Reject" on the auth landing — visit proceeds without consent (administrative override).
 * @property {string} [ekycOrigin] - Expected origin of the eKYC iframe's postMessage events for security validation. Defaults to https://test.ekyc.pesaflow.com.
 *
 * @example
 * // OTP-only mode (existing behavior, unchanged)
 * launchOtpVerificationModal({
 *   otpLength: 6,
 *   phoneNumber: '254700000000',
 *   onRequestOtp: async (phone) => sendSHAOtp(crId, codes),
 *   onVerify: async (otp) => createSHAVirtualClaim(crId, otp, ...),
 *   onVerificationSuccess: () => console.log('verified'),
 * });
 *
 * @example
 * // Multi-method auth mode (biometric + OTP + whitelist)
 * launchOtpVerificationModal({
 *   authMode: 'multi',
 *   whitelistedForOTP: patient.whitelisted_for_otp ?? false,
 *   phoneNumber: '254700000000',
 *
 *   // OTP wiring
 *   onRequestOtp: async (phone) => sendSHAOtp(crId, codes),
 *   onVerify: async (otp) => createSHAVirtualClaim(crId, otp, ...),
 *   onVerificationSuccess: () => { ... },
 *
 *   // Biometric wiring
 *   onStartBiometric: async () => {
 *     const res = await createSHABiometricAuthorize({ ... });
 *     if (!res.success || !res.embed_url) throw new Error(res.error);
 *     return {
 *       embed_url: res.embed_url,
 *       authorization_code: res.authorization_code!,
 *       consent_token: res.consent_token!,
 *     };
 *   },
 *   onBiometricSuccess: (result) => {
 *     shaClaimResponseRef.current = result;
 *   },
 *   onBiometricCancel: async (consentToken) => {
 *     if (consentToken) await cancelBiometricSession(consentToken);
 *   },
 *
 *   // Escape paths
 *   onRequestWhitelist: () => launchWhitelistSubmissionModal({ patientCRId }),
 *   onRejected: () => markVisitProceedingWithoutConsent(),
 * });
 */
export type OTPVerificationModalOptions = {
  // ── existing OTP props ──
  otpLength?: number;
  onVerify?: (otp: string) => Promise<void>;
  obscureText?: boolean;
  centerBoxes?: boolean;
  phoneNumber: string;
  onRequestOtp?: (phoneNumber: string) => Promise<void>;
  onVerificationSuccess?: () => void;
  expiryMinutes?: number;
  size?: ModalSize;
  onCleanup?: () => void;

  // ── new multi-method auth props ──
  /** When 'multi', shows the auth-landing method picker first. Defaults to 'otp-only'. */
  authMode?: 'otp-only' | 'multi';

  /** Whether the patient is approved for OTP whitelist bypass. */
  whitelistedForOTP?: boolean;

  /** Called when user picks biometric. Resolve with embed_url + auth code. */
  onStartBiometric?: () => Promise<BiometricStartResult>;

  /** Called on successful biometric capture (postMessage SUCCESS from eKYC). */
  onBiometricSuccess?: (result: BiometricSuccessResult) => void;

  /** Called when biometric session is cancelled. Wire to backend /biometric-cancel. */
  onBiometricCancel?: (consentToken: string | null) => void;

  /** Called when user clicks "Request OTP Whitelisting". */
  onRequestWhitelist?: () => void;

  /** Called when user clicks "Reject" — visit proceeds without consent. */
  onRejected?: () => void;

  /** Expected origin of eKYC postMessage events. Defaults to https://test.ekyc.pesaflow.com. */
  ekycOrigin?: string;

  /** Whether this modal is being used to start or end a visit. Defaults to 'start'. Affects progress message text. */
  visitAction?: 'start' | 'end';
};

/**
 * Launch the OTP / Secure Patient Authentication modal with the provided options.
 *
 * @param props - Configuration options for the modal
 * @returns A dispose function to close the modal programmatically
 */
export const launchOtpVerificationModal = (props: OTPVerificationModalOptions) => {
  const { onCleanup, ...modalProps } = props;

  const dispose = showModal('otp-verification-modal', {
    onClose: () => {
      onCleanup?.();
      dispose();
    },
    ...modalProps,
    centerBoxes: modalProps?.centerBoxes ?? true,
  });

  return dispose;
};

export default otpVerificationModal;
