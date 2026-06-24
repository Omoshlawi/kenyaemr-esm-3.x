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
  Tag,
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
  useOtpWhitelistReasons,
  usePatientPhone,
  useProviderNationalId,
} from '../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { useSHAEligibility } from '../../../../billing-form/hie.resource';
import { dischargeClaim, requestDischargeOtp, submitClaim, useDischargeReasons } from './claim-submit-resource';
import { ClaimSubmitFormData, claimSubmitSchema } from './claim-submit-schema';
import {
  extractUpstreamError,
  toLocalIsoWithOffset,
} from '../../../claims-management/table/virtual-claim-preauth/utils';

type ClaimSubmitWorkspaceProps = {
  consentToken: string;
  invoiceNumber: string;
  serviceType: string;
  patientUuid: string;
  patientCRId: string;
  interventions: Array<string>;
  paymentMechanism?: string;
  isResubmission?: boolean;
  totalAmount?: number;
  mutate: () => void;
  providerWorkflowState?: string;
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
    interventions,
    paymentMechanism,
    isResubmission = false,
    providerWorkflowState,
    totalAmount,
    mutate,
  } = workspaceProps ?? ({} as ClaimSubmitWorkspaceProps);

  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const isInpatient = serviceType === 'INPATIENT';

  const phoneNumber = usePatientPhone(patientUuid);
  const { isPatientWhiteListed } = useSHAEligibility(patientUuid);
  const { reasons: whitelistReasons } = useOtpWhitelistReasons();
  const { currentProvider } = useSession();
  const { providerNationalid } = useProviderNationalId(currentProvider?.uuid ?? '');
  const { agentUrl } = useBiometricConfig();
  const { workstationId } = useBiometricAgentStatus(agentUrl);
  const deviceOs = detectAuthorizingDeviceOS();

  const { reasons: dischargeReasons, isLoading: isLoadingReasons } = useDischargeReasons();

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

  const dischargeReasonRef = useRef<string>('');
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
      const params = {
        consentToken,
        invoiceNumber,
        dischargeReason: dischargeReasonRef.current,
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
    [consentToken, invoiceNumber, isInpatient, t],
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
        interventions,
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
          setTimeout(() => closeWorkspace(), 800);
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
          setTimeout(() => closeWorkspace(), 800);
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
          setTimeout(() => closeWorkspace(), 800);
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
  }, [consentToken, runSubmit, mutate, t]);

  if (!workspaceProps) {
    return null;
  }

  const shouldSkipOtp = isResubmission && providerWorkflowState === 'DRAFT_RESUBMIT';

  const onContinue = (data: ClaimSubmitFormData) => {
    dischargeReasonRef.current = data.discharge_reason;
    dischargeDateIsoRef.current = isInpatient ? buildDischargeDateIso() : '';
    if (shouldSkipOtp) {
      launchResubmitConfirm();
    } else {
      launchAuthModal();
    }
  };

  const workspaceTitle = isResubmission
    ? t('resubmitClaim', 'Resubmit claim — {{code}}', { code: consentToken })
    : t('submitClaim', 'Submit claim — {{code}}', { code: consentToken });

  return (
    <Workspace2 hasUnsavedChanges={isDirty && !submitSucceeded} title={workspaceTitle}>
      <form onSubmit={handleSubmit(onContinue)} className={styles.form}>
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
                <span className={styles.summaryValue}>{interventions.length}</span>
              </div>
              {totalAmount !== undefined && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>{t('totalAmount', 'Total amount')}</span>
                  <span className={styles.summaryValue}>KES {totalAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </section>

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
            {selectedReasonItem?.description && <p className={styles.reasonHint}>{selectedReasonItem.description}</p>}
          </section>

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

        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()} disabled={isSubmitting}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            className={styles.button}
            disabled={isSubmitting || isLoadingReasons || submitSucceeded}
            kind={isResubmission ? 'danger' : 'primary'}
            type="submit"
            renderIcon={submitSucceeded ? CheckmarkFilled : undefined}>
            {isSubmitting ? (
              <InlineLoading className={styles.spinner} description={t('verifying', 'Verifying…')} />
            ) : (
              <span>
                {shouldSkipOtp
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
