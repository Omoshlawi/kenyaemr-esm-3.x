import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  showModal,
  showSnackbar,
  useLayoutType,
  useSession,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import {
  Button,
  ButtonSet,
  DatePicker,
  DatePickerInput,
  Dropdown,
  InlineLoading,
  InlineNotification,
  Select,
  SelectItem,
  Tag,
  TextInput,
  TimePicker,
} from '@carbon/react';
import { CheckmarkFilled } from '@carbon/react/icons';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './claim-submit.scss';
import {
  checkBiometricAuthorizationStatus,
  createSHABiometricAuthorize,
  detectAuthorizingDeviceOS,
  fetchWhitelistStatus,
  rejectBiometricAuthorization,
  submitOtpWhitelist,
  useBiometricAgentStatus,
  useBiometricConfig,
  useEmergencyCatalog,
  useEmergencyInterventions,
  useOtpWhitelistReasons,
  usePatientPhone,
  useProviderNationalId,
} from '../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { useSHAEligibility } from '../../../../billing-form/hie.resource';
import {
  dischargeClaim,
  requestDischargeOtp,
  submitClaim,
  useCloseReasons,
  useDischargeReasons,
  usePreviewClaim,
} from './claim-submit-resource';
import { closeInsuranceClaim } from '../../../claims-management/table/claim-summary-modal/claim.resource';
import { ClaimSubmitFormData, claimSubmitSchema } from './claim-submit-schema';
import {
  extractUpstreamError,
  toLocalIsoWithOffset,
} from '../../../claims-management/table/virtual-claim-preauth/utils';
import ClaimReviewSection from './claim-review-section.component';
import ClaimShaPreview from './claim-sha-preview.component';

type ClaimSubmitWorkspaceProps = {
  consentToken: string;
  invoiceNumber: string;
  serviceType: string;
  patientUuid: string;
  patientCRId: string;
  isUnidentified?: boolean;
  interventions: Array<string>;
  paymentMechanism?: string;
  isResubmission?: boolean;
  isCancelMode?: boolean;
  totalAmount?: number;
  mutate: () => void;
  providerWorkflowState?: string;
  skipAuthorization?: boolean;
  preview?: {
    interventions?: Array<{
      intervention_code: string;
      intervention_name?: string;
      preauth_type?: string;
      payment_mechanism?: string | null;
    }>;
    diagnoses?: Array<{ icd_code: string; icd_description?: string; status?: string }>;
    billLines?: Array<{ item_name?: string | null; intervention_code?: string; line_total_amount?: number | null }>;
  };
};

const RequiredLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span>
    {children}
    <span className={styles.required} aria-hidden="true">
      *
    </span>
  </span>
);

const ClaimSubmitWorkspace: React.FC<Workspace2DefinitionProps<ClaimSubmitWorkspaceProps, {}, {}>> = ({
  workspaceProps,
  closeWorkspace,
}) => {
  const {
    consentToken,
    invoiceNumber,
    serviceType,
    patientUuid,
    patientCRId,
    isUnidentified,
    interventions,
    paymentMechanism,
    isResubmission = false,
    isCancelMode = false,
    providerWorkflowState,
    skipAuthorization = false,
    totalAmount,
    preview,
    mutate,
  } = workspaceProps ?? ({} as ClaimSubmitWorkspaceProps);

  const previewDiagnoses = preview?.diagnoses ?? [];
  const previewBillLines = preview?.billLines ?? [];

  const {
    preview: shaPreview,
    isLoading: isLoadingShaPreview,
    error: shaPreviewError,
  } = usePreviewClaim(isCancelMode ? undefined : consentToken);

  // The launch-time `interventions`/`totalAmount` props reflect the claim as it stood when the
  // claim-submit action fired, which can be stale or incomplete (e.g. PHC claims are resolved
  // server-side after submission). Prefer the live SHA preview — the same source backing the
  // "Review before submitting" panel below — so the summary card can't drift out of sync with it.
  const previewInterventionsCount = shaPreview?.sha?.interventions?.length;
  const summaryInterventionsCount = previewInterventionsCount ?? interventions.length;

  const toNumber = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };
  const previewTotalAmount =
    toNumber((shaPreview?.sha as Record<string, unknown> | undefined)?.total_claim_amount) ||
    (shaPreview?.sha?.invoices?.reduce(
      (sum, invoice) => sum + toNumber(invoice.total_inv_amount ?? invoice.total_amount ?? invoice.net_amount),
      0,
    ) ??
      0);
  const summaryTotalAmount = previewTotalAmount || totalAmount;

  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const isInpatient = serviceType === 'INPATIENT';
  const isEmergency = (serviceType ?? '').toUpperCase() === 'EMERGENCY';
  const isUnidentifiedEmergency = isEmergency && (isUnidentified ?? !patientCRId);
  const RESUBMIT_FAILED_STATES = new Set(['FAILED_TO_SUBMIT', 'SUBMIT_FAILED_RETRY']);
  const isResubmitFailed = RESUBMIT_FAILED_STATES.has((providerWorkflowState ?? '').toUpperCase());
  const skipAuth = skipAuthorization || isResubmitFailed;

  const phoneNumber = usePatientPhone(patientUuid);
  const { isPatientWhiteListed } = useSHAEligibility(patientUuid);
  const { reasons: whitelistReasons } = useOtpWhitelistReasons();
  const { currentProvider } = useSession();
  const { providerNationalid } = useProviderNationalId(currentProvider?.uuid ?? '');
  const { agentUrl } = useBiometricConfig();
  const { workstationId } = useBiometricAgentStatus(agentUrl);
  const deviceOs = detectAuthorizingDeviceOS();

  const { reasons: dischargeReasons, isLoading: isLoadingReasons } = useDischargeReasons();
  const { reasons: closeReasons, isLoading: isLoadingCloseReasons } = useCloseReasons();

  const [dischargeDate, setDischargeDate] = useState<Date>(() => new Date());
  const [dischargeTimeText, setDischargeTimeText] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
  } = useForm<ClaimSubmitFormData>({
    resolver: zodResolver(claimSubmitSchema),
    defaultValues: { discharge_reason: '', discharge_date: '' },
  });

  const dischargeReasonSelected = watch('discharge_reason');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSucceeded, setSubmitSucceeded] = useState(false);

  const [cancelReasonText, setCancelReasonText] = useState('');
  const [cancelReasonType, setCancelReasonType] = useState('OTHER_REASONS');

  const [unknownPatientReason, setUnknownPatientReason] = useState('');
  const [unknownReasonError, setUnknownReasonError] = useState(false);
  const { entries: unknownPatientReasons } = useEmergencyCatalog('reason-for-unknown-patient');
  const { interventions: emergencyInterventions } = useEmergencyInterventions();
  const emergencyTariffs = useMemo(() => {
    const map: Record<string, number> = {};
    for (const iv of emergencyInterventions) {
      const tariff = Number(iv.tariff);
      if (iv.value && !Number.isNaN(tariff)) {
        map[iv.value] = tariff;
      }
    }
    return map;
  }, [emergencyInterventions]);

  const handleCancelClaim = useCallback(async () => {
    if (!cancelReasonText.trim()) {
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    const result = await closeInsuranceClaim(cancelReasonType, cancelReasonText, patientUuid, consentToken);
    setIsSubmitting(false);
    if (result.success) {
      showSnackbar({
        kind: 'success',
        title: t('cancelClaim', 'Cancel Claim'),
        subtitle: t('claimCanceledSuccessfully', 'Claim canceled successfully'),
        timeoutInMs: 3000,
      });
      mutate();
      setTimeout(() => closeWorkspace({ discardUnsavedChanges: true }), 800);
    } else {
      setSubmitError(result.upstreamError ?? t('cancelClaimFailed', 'Failed to cancel claim'));
    }
  }, [cancelReasonType, cancelReasonText, patientUuid, mutate, closeWorkspace, t]);

  const dischargeReasonRef = useRef<string>('');
  const unknownReasonRef = useRef<string>('');
  const dischargeDateIsoRef = useRef<string>('');

  const buildDischargeDateIso = useCallback((): string => {
    const [hh, mm] = (dischargeTimeText || '00:00').split(':').map((p) => parseInt(p, 10));
    const finalDate = new Date(dischargeDate);
    if (!isNaN(hh)) {
      finalDate.setHours(hh);
    }
    if (!isNaN(mm)) {
      finalDate.setMinutes(mm);
    }
    finalDate.setSeconds(0);
    return toLocalIsoWithOffset(finalDate);
  }, [dischargeDate, dischargeTimeText]);

  const handleDischargeTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^\d:]/g, '');
    if (v.length === 2 && !v.includes(':')) {
      v = v + ':';
    }
    if (v.length > 5) {
      v = v.slice(0, 5);
    }
    setDischargeTimeText(v);
  }, []);

  const runSubmit = useCallback(
    async (auth: { otp: string } | { dischargeAuthGuid: string } | Record<string, never>) => {
      const isAuthlessResubmit = !('otp' in auth) && !('dischargeAuthGuid' in auth);
      const params = {
        consentToken,
        invoiceNumber,
        dischargeReason: dischargeReasonRef.current,
        skipAuthCheck: isAuthlessResubmit || skipAuth || isEmergency,
        isEmergency,
        reasonForUnknownPatient: unknownReasonRef.current,
        ...('otp' in auth ? { otp: (auth as { otp: string }).otp } : {}),
        ...('dischargeAuthGuid' in auth
          ? { dischargeAuthGuid: (auth as { dischargeAuthGuid: string }).dischargeAuthGuid }
          : {}),
      };

      const result = isInpatient
        ? await dischargeClaim({ ...params, dischargeDate: dischargeDateIsoRef.current }, t)
        : await submitClaim(params, t);

      if (!result.ok) {
        throw new Error(result.error ?? t('submitFailed', 'Submit failed'));
      }
      return result;
    },
    [consentToken, invoiceNumber, isInpatient, isEmergency, skipAuth, t],
  );

  const buildBiometricStarter = useCallback(() => {
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
        patient_id: patientCRId,
        interventions: [interventions[0]],
        service_type: serviceType,
        workstation_id: workstationId,
        authorizing_device_os: deviceOs,
        payment_mechanism: paymentMechanism,
        patient_uuid: patientUuid,
        is_biometrics_discharge_authorization: true,
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
  }, [
    providerNationalid,
    workstationId,
    deviceOs,
    patientCRId,
    interventions,
    serviceType,
    paymentMechanism,
    patientUuid,
    t,
  ]);

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
      is_rejected: (status as any).is_rejected,
      latest_status: status.latest_status,
      reviewer_note: (status as any).reviewer_note,
    };
  }, []);

  const launchAuthModal = useCallback(() => {
    if (!patientCRId) {
      setSubmitError(t('noCRNumberSubmit', 'Patient has no SHA CR number — cannot proceed with submission.'));
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    let settled = false;
    const settle = (fn?: () => void) => {
      if (!settled) {
        settled = true;
        fn?.();
      }
    };

    const dispose = showModal('otp-verification-modal', {
      onClose: () => {
        settle(() => {
          dispose();
          setIsSubmitting(false);
        });
      },

      phoneNumber,
      otpLength: 6,
      expiryMinutes: 5,
      centerBoxes: true,
      visitAction: 'end',

      authMode: 'multi',
      whitelistedForOTP: isPatientWhiteListed,
      patientCRId,

      onRequestOtp: async () => {
        const res = await requestDischargeOtp(consentToken, patientCRId, t);
        if (!res.success) {
          throw new Error(res.error ?? t('otpRequestFailed', 'Failed to send OTP'));
        }
      },

      onVerify: async (otp: string) => {
        await runSubmit({ otp });
      },
      onVerificationSuccess: () => {
        setSubmitSucceeded(true);
        settle(() => {
          dispose();
          showSnackbar({
            title: isResubmission ? t('claimResubmitted', 'Claim resubmitted') : t('claimSubmitted', 'Claim submitted'),
            subtitle: t('claimSubmittedDesc', 'Claim {{code}} sent to payer for review', {
              code: consentToken,
            }),
            kind: 'success',
            isLowContrast: true,
          });
          mutate();
          setTimeout(() => closeWorkspace({ discardUnsavedChanges: true }), 800);
        });
      },

      onCleanup: () => {
        setIsSubmitting(false);
      },

      onStartBiometric: buildBiometricStarter(),
      onCheckBiometricStatus: checkBiometricAuthorizationStatus,
      onBiometricSuccess: async (result: { authorization_code: string; consent_token: string; guid: string }) => {
        await runSubmit({ dischargeAuthGuid: result.guid });
        setSubmitSucceeded(true);
        settle(() => {
          dispose();
          showSnackbar({
            title: isResubmission ? t('claimResubmitted', 'Claim resubmitted') : t('claimSubmitted', 'Claim submitted'),
            subtitle: t('claimSubmittedDesc', 'Claim {{code}} sent to payer for review', {
              code: consentToken,
            }),
            kind: 'success',
            isLowContrast: true,
          });
          mutate();
          setTimeout(() => closeWorkspace({ discardUnsavedChanges: true }), 800);
        });
      },
      onBiometricCancel: async (token: string | null) => {
        if (token) {
          try {
            await rejectBiometricAuthorization(token);
          } catch (err) {
            console.warn('Failed to reject biometric auth on cancel:', err);
          }
        }
      },

      whitelistReasons,
      onSubmitWhitelist: handleSubmitWhitelist,
      onCheckWhitelistStatus: handleCheckWhitelistStatus,
    });
  }, [
    patientCRId,
    phoneNumber,
    isPatientWhiteListed,
    consentToken,
    isResubmission,
    runSubmit,
    buildBiometricStarter,
    whitelistReasons,
    handleSubmitWhitelist,
    handleCheckWhitelistStatus,
    mutate,
    closeWorkspace,
    t,
  ]);

  const dischargeReasonItems = useMemo(
    () =>
      dischargeReasons.map((r) => ({
        id: r.code,
        label: r.label,
        description: r.description,
      })),
    [dischargeReasons],
  );

  const selectedReasonItem = useMemo(
    () => dischargeReasonItems.find((r) => r.id === dischargeReasonSelected) ?? null,
    [dischargeReasonItems, dischargeReasonSelected],
  );

  const launchResubmitConfirm = useCallback(() => {
    setSubmitError(null);
    const dispose = showModal('resubmit-confirm-modal', {
      consentToken,
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          await runSubmit({});
          setSubmitSucceeded(true);
          showSnackbar({
            title: t('claimResubmitted', 'Claim resubmitted'),
            subtitle: t('claimSubmittedDesc', 'Claim {{code}} sent to payer for review', {
              code: consentToken,
            }),
            kind: 'success',
            isLowContrast: true,
          });
          mutate();
          setTimeout(() => closeWorkspace({ discardUnsavedChanges: true }), 800);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setSubmitError(msg);
          throw err;
        } finally {
          setIsSubmitting(false);
        }
      },
      closeModal: () => dispose(),
    });
  }, [consentToken, runSubmit, mutate, closeWorkspace, t]);

  if (!workspaceProps) {
    return null;
  }

  const shouldSkipOtp = skipAuth || isResubmission || isResubmitFailed || isEmergency;

  const onContinueEmergency = async (data: ClaimSubmitFormData) => {
    if (isUnidentifiedEmergency && !unknownPatientReason) {
      setUnknownReasonError(true);
      return;
    }
    dischargeReasonRef.current = data.discharge_reason;
    unknownReasonRef.current = isUnidentifiedEmergency ? unknownPatientReason : '';
    dischargeDateIsoRef.current = '';
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await runSubmit({});
      setSubmitSucceeded(true);
      showSnackbar({
        title: t('claimSubmitted', 'Claim submitted'),
        subtitle: t('claimSubmittedDesc', 'Claim {{code}} sent to payer for review', { code: consentToken }),
        kind: 'success',
        isLowContrast: true,
      });
      mutate();
      setTimeout(() => closeWorkspace({ discardUnsavedChanges: true }), 800);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onContinue = (data: ClaimSubmitFormData) => {
    dischargeReasonRef.current = data.discharge_reason;
    dischargeDateIsoRef.current = isInpatient ? buildDischargeDateIso() : '';
    if (shouldSkipOtp) {
      launchResubmitConfirm();
    } else {
      launchAuthModal();
    }
  };

  // A claim that failed to submit already carries its original discharge reason
  // and authorization on file — retrying it needs neither re-entered.
  const onContinueResubmitFailed = () => {
    dischargeReasonRef.current = '';
    dischargeDateIsoRef.current = isInpatient ? buildDischargeDateIso() : '';
    launchResubmitConfirm();
  };

  const workspaceTitle = isCancelMode
    ? t('cancelClaim', 'Cancel claim — {{code}}', { code: consentToken })
    : isResubmission
    ? t('resubmitClaim', 'Resubmit claim — {{code}}', { code: consentToken })
    : t('submitClaim', 'Submit claim — {{code}}', { code: consentToken });

  if (isCancelMode) {
    return (
      <Workspace2 hasUnsavedChanges={!!cancelReasonText && !submitSucceeded} title={workspaceTitle}>
        <div className={styles.form}>
          <div className={styles.formContainer}>
            <section className={styles.formSection}>
              <section className={styles.formSection}>
                <Select
                  id="cancel-reason-type"
                  labelText={t('cancelReasonType', 'Cancel reason type')}
                  value={cancelReasonType}
                  onChange={(e) => setCancelReasonType((e.target as HTMLSelectElement).value)}
                  disabled={isSubmitting || isLoadingCloseReasons}>
                  {isLoadingCloseReasons ? (
                    <SelectItem value="" text={t('loadingReasons', 'Loading reasons…')} />
                  ) : (
                    closeReasons.map((reason) => (
                      <SelectItem key={reason.code} value={reason.code} text={reason.label} />
                    ))
                  )}
                </Select>
              </section>
              <TextInput
                id="cancel-reason-text"
                labelText={t('cancelReason', 'Cancel reason')}
                placeholder={t('enterCancelReason', 'Enter a detailed cancellation reason')}
                value={cancelReasonText}
                onChange={(e) => setCancelReasonText((e.target as HTMLInputElement).value)}
                disabled={isSubmitting}
              />
            </section>
            {submitError && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title={t('cancelClaimError', 'Cancel error')}
                subtitle={submitError}
                className={styles.errorBanner}
              />
            )}
          </div>
          <ButtonSet
            className={classNames(styles.buttonSet, { [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
            <Button
              className={styles.button}
              kind="secondary"
              onClick={() => closeWorkspace({ discardUnsavedChanges: true })}
              disabled={isSubmitting}>
              {t('close', 'Close')}
            </Button>
            <Button
              className={styles.button}
              kind="danger"
              disabled={isSubmitting || !cancelReasonText.trim()}
              onClick={handleCancelClaim}>
              {isSubmitting ? (
                <InlineLoading className={styles.spinner} description={t('canceling', 'Canceling…')} />
              ) : (
                t('cancelClaim', 'Cancel claim')
              )}
            </Button>
          </ButtonSet>
        </div>
      </Workspace2>
    );
  }

  return (
    <Workspace2 hasUnsavedChanges={isDirty && !submitSucceeded} title={workspaceTitle}>
      <form
        onSubmit={
          isEmergency
            ? handleSubmit(onContinueEmergency)
            : isResubmitFailed
            ? (e) => {
                e.preventDefault();
                onContinueResubmitFailed();
              }
            : handleSubmit(onContinue)
        }
        className={styles.form}>
        <div className={styles.formContainer}>
          <section className={styles.summaryCard}>
            <h6 className={styles.summaryTitle}>{t('claimSummary', 'Claim summary')}</h6>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{t('invoice', 'Invoice')}</span>
                <code className={styles.summaryValue}>{invoiceNumber}</code>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{t('serviceType', 'Service type')}</span>
                <Tag type={isInpatient ? 'magenta' : 'blue'} size="sm">
                  {serviceType}
                </Tag>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>{t('interventions', 'Interventions')}</span>
                <span className={styles.summaryValue}>{summaryInterventionsCount}</span>
              </div>
              {summaryTotalAmount !== undefined && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>{t('totalAmount', 'Total amount')}</span>
                  <span className={styles.summaryValue}>KES {summaryTotalAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </section>

          {!isCancelMode && (
            <ClaimShaPreview
              preview={shaPreview}
              isLoading={isLoadingShaPreview}
              error={shaPreviewError}
              fallbackTariffs={isEmergency ? emergencyTariffs : undefined}
            />
          )}

          <ClaimReviewSection diagnoses={previewDiagnoses} billLines={previewBillLines} />

          {isResubmitFailed ? (
            <InlineNotification
              kind="info"
              lowContrast
              hideCloseButton
              title={t('resubmitFailedNote', 'No changes needed')}
              subtitle={t(
                'resubmitFailedNoteDesc',
                'This claim already has a discharge reason and authorization on file — resubmitting will retry sending it to SHA without asking again.',
              )}
              className={styles.errorBanner}
            />
          ) : (
            <>
              <section className={styles.formSection}>
                <Controller
                  name="discharge_reason"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      id="discharge-reason"
                      titleText={<RequiredLabel>{t('dischargeReason', 'Discharge reason')}</RequiredLabel>}
                      label={
                        isLoadingReasons
                          ? t('loadingReasons', 'Loading reasons…')
                          : t('selectDischargeReason', 'Select a reason')
                      }
                      items={dischargeReasonItems}
                      itemToString={(item) => (item ? item.label : '')}
                      selectedItem={selectedReasonItem}
                      onChange={({ selectedItem }) => field.onChange(selectedItem?.id ?? '')}
                      disabled={isLoadingReasons || isSubmitting}
                      invalid={!!errors.discharge_reason}
                      invalidText={errors.discharge_reason?.message}
                    />
                  )}
                />
                {selectedReasonItem?.description && (
                  <p className={styles.reasonHint}>{selectedReasonItem.description}</p>
                )}
              </section>

              {isUnidentifiedEmergency && (
                <section className={styles.formSection}>
                  <Dropdown
                    id="unknown-patient-reason"
                    titleText={
                      <RequiredLabel>{t('reasonForUnknownPatient', 'Reason patient is unidentified')}</RequiredLabel>
                    }
                    label={t('selectReason', 'Select a reason')}
                    items={unknownPatientReasons}
                    itemToString={(item) => item?.label ?? ''}
                    selectedItem={unknownPatientReasons.find((r) => r.value === unknownPatientReason) ?? null}
                    onChange={({ selectedItem }) => {
                      setUnknownPatientReason(selectedItem?.value ?? '');
                      setUnknownReasonError(false);
                    }}
                    disabled={isSubmitting}
                    invalid={unknownReasonError}
                    invalidText={t('reasonRequired', 'A reason is required')}
                  />
                </section>
              )}

              {isInpatient && (
                <section className={styles.formSection}>
                  <p className={styles.sectionLabel}>
                    <RequiredLabel>{t('dischargeDateAndTime', 'Discharge date and time')}</RequiredLabel>
                  </p>
                  <p className={styles.sectionHint}>
                    {t(
                      'dischargeDateHint',
                      'Used by SHA for per-diem calculations. Pre-filled with now — adjust if the patient was discharged earlier.',
                    )}
                  </p>
                  <div className={styles.dateTimeRow}>
                    <DatePicker
                      datePickerType="single"
                      value={dischargeDate}
                      maxDate={new Date()}
                      onChange={(dates) => {
                        if (dates[0]) {
                          setDischargeDate(dates[0]);
                        }
                      }}>
                      <DatePickerInput
                        id="discharge-date"
                        labelText={t('date', 'Date')}
                        placeholder="dd/mm/yyyy"
                        disabled={isSubmitting}
                      />
                    </DatePicker>
                    <TimePicker
                      id="discharge-time"
                      labelText={t('time', 'Time')}
                      value={dischargeTimeText}
                      onChange={handleDischargeTimeChange}
                      disabled={isSubmitting}
                      pattern="(\d{2}):(\d{2})"
                      placeholder="hh:mm"
                      maxLength={5}
                    />
                  </div>
                </section>
              )}
            </>
          )}

          {submitError && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title={t('submitError', 'Submit error')}
              subtitle={submitError}
              className={styles.errorBanner}
            />
          )}

          {submitSucceeded && (
            <InlineNotification
              kind="success"
              lowContrast
              hideCloseButton
              title={t('submitted', 'Submitted')}
              subtitle={t('claimDispatchedToPayer', 'Claim dispatched to payer — finishing up…')}
              className={styles.errorBanner}
            />
          )}
        </div>

        <ButtonSet className={classNames(styles.buttonSet, { [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button
            className={styles.button}
            kind="secondary"
            onClick={() => closeWorkspace({ discardUnsavedChanges: true })}
            disabled={isSubmitting}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            className={styles.button}
            disabled={isSubmitting || (!isResubmitFailed && isLoadingReasons) || submitSucceeded}
            kind={isResubmission ? 'danger' : 'primary'}
            type="submit"
            renderIcon={submitSucceeded ? CheckmarkFilled : undefined}>
            {isSubmitting ? (
              <InlineLoading className={styles.spinner} description={t('verifying', 'Verifying…')} />
            ) : (
              <span>
                {isEmergency
                  ? t('submit', 'Submit')
                  : shouldSkipOtp
                  ? t('resubmitToSha', 'Resubmit to SHA')
                  : isResubmission
                  ? t('continueResubmit', 'Continue to resubmit')
                  : t('continueToSubmit', 'Continue to submit')}
              </span>
            )}
          </Button>
        </ButtonSet>
      </form>
    </Workspace2>
  );
};

export default ClaimSubmitWorkspace;
