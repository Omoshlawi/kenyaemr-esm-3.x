import {
  Button,
  ButtonSet,
  ComboBox,
  Form,
  InlineLoading,
  InlineNotification,
  Layer,
  Select,
  SelectItem,
  Stack,
  Tag,
} from '@carbon/react';
import {
  ExtensionSlot,
  showModal,
  showSnackbar,
  useConfig,
  useLayoutType,
  useSession,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import styles from './elective-auth.scss';
import {
  checkBiometricAuthorizationStatus,
  createElectiveAuthorization,
  createSHABiometricAuthorize,
  detectAuthorizingDeviceOS,
  fetchWhitelistStatus,
  rejectBiometricAuthorization,
  sendSHAOtp,
  submitOtpWhitelist,
  useBiometricAgentStatus,
  useBiometricConfig,
  useNonPomsfUtilization,
  useOtpWhitelistReasons,
  usePatientPhone,
  useProviderNationalId,
  useSHAInterventions,
  useSHASubBenefits,
} from '../../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { computeAgeInYears } from '../../../../../billing-form/social-health-authority/helper';
import { useSHAEligibility } from '../../../../../billing-form/hie.resource';
import { BillingConfig } from '../../../../../config-schema';
import usePatient from '../../../../../hooks/usePatient';
import PatientBanner from './patient-banner/patient-banner.component';
import { ElectivePreAuthFormData, electivePreAuthSchema } from '../pre-auth-workspace/pre-auth-schema';
import { extractUpstreamError } from '../utils';
import { handleMutation } from '../../../../../bill-administration/payment-modes/payment-mode.resource';
import { virtualClaimBaseUrl } from '../constants';
import { formatCurrency } from '../../../../../helpers/currency';

interface ElectivePreAuthFormProps {
  mutate?: () => void;
  workspaceTitle?: string;
}

type SubBenefitItem = {
  code: string;
  name: string;
  label: string;
};

type InterventionItem = {
  id: string;
  code: string;
  name: string;
  text: string;
  disabled: boolean;
  isElective: boolean;
};

const ElectivePreAuthForm: React.FC<Workspace2DefinitionProps<ElectivePreAuthFormProps, object, object>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const closeWorkspaceWithSavedChanges = () => {
    setHasUnsavedChanges(false);
    closeWorkspace();
  };
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const { mutate } = workspaceProps ?? {};
  const workspaceTitle =
    workspaceProps?.workspaceTitle ?? t('createElectivePreauth', 'Create Elective Pre-Authorization');

  const { crIdentificationNumberUUID, minorOtpAgeThreshold } = useConfig<BillingConfig>();

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ElectivePreAuthFormData>({
    resolver: zodResolver(electivePreAuthSchema),
    defaultValues: {
      patientUuid: '',
      subBenefitCode: null,
      interventionCode: null,
      serviceType: 'OUTPATIENT',
    },
  });

  const patientUuid = watch('patientUuid');
  const subBenefitCode = watch('subBenefitCode');
  const interventionCode = watch('interventionCode');

  const { patient } = usePatient(patientUuid ?? '');
  const crId: string | null =
    patient?.identifiers?.find((id) => id.identifierType?.uuid === crIdentificationNumberUUID)?.identifier ?? null;

  const patientPhone = usePatientPhone(patientUuid ?? '');

  const { isPatientWhiteListed, facilityBiometricsEnforced, eligibilityData } = useSHAEligibility(patientUuid ?? '');
  const { reasons: whitelistReasons } = useOtpWhitelistReasons();

  const isMinorOtpEligible = useMemo(() => {
    if (!minorOtpAgeThreshold || minorOtpAgeThreshold <= 0) {
      return false;
    }
    const shaAge = eligibilityData?.age;
    if (typeof shaAge === 'number') {
      return shaAge < minorOtpAgeThreshold;
    }
    const age = computeAgeInYears(eligibilityData?.dateOfBirth);
    return age !== null && age < minorOtpAgeThreshold;
  }, [minorOtpAgeThreshold, eligibilityData]);

  const effectiveWhitelistedForOTP = isPatientWhiteListed || isMinorOtpEligible;
  const effectiveBiometricsEnforced = facilityBiometricsEnforced && !isMinorOtpEligible;
  const canUseOtp = !effectiveBiometricsEnforced || effectiveWhitelistedForOTP;

  const { currentProvider } = useSession();
  const { providerNationalid } = useProviderNationalId(currentProvider?.uuid ?? '');
  const { agentUrl } = useBiometricConfig();
  const { workstationId } = useBiometricAgentStatus(agentUrl);
  const deviceOs = detectAuthorizingDeviceOS();

  const { subBenefits, isLoading: loadingSubBenefits } = useSHASubBenefits(crId ?? '');
  const { interventions, isLoading: loadingInterventions } = useSHAInterventions(crId ?? '', subBenefitCode ?? '');

  const {
    utilization,
    isLoading: loadingUtilization,
    error: utilizationError,
  } = useNonPomsfUtilization(crId ?? '', interventionCode ?? '');
  const isCoverageExhausted = Boolean(utilization && utilization.eligibility === false);

  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorizeError, setAuthorizeError] = useState('');

  const subBenefitItems: Array<SubBenefitItem> = useMemo(
    () =>
      subBenefits.map((b) => ({
        code: b.code,
        name: b.name,
        label: `${b.code} — ${b.name}`,
      })),
    [subBenefits],
  );

  const interventionItems: Array<InterventionItem> = useMemo(
    () =>
      interventions
        .map((i) => {
          const isElective = Boolean((i as any).needs_manual_preauth_approval);
          const tariff = (i as any).tariff ? ` · ${formatCurrency(Number((i as any).tariff))}` : '';
          const suffix = isElective
            ? ` — ${t('electivePreauth', 'Elective preauth')}`
            : i.needs_preauth
            ? ` — ${t('preauthRequired', 'Preauth required — use normal visit')}`
            : ` — ${t('noPreauthNeeded', 'No preauth — use normal visit')}`;
          return {
            id: `intervention-${i.code}`,
            code: i.code,
            name: i.name,
            text: `${i.name}${tariff}${suffix}`,
            disabled: !isElective,
            isElective,
          };
        })
        .sort((a, b) => Number(b.isElective) - Number(a.isElective)),
    [interventions, t],
  );

  const electiveCount = useMemo(() => interventionItems.filter((i) => i.isElective).length, [interventionItems]);
  const selectedIntervention = interventions.find((i) => i.code === interventionCode);
  const selectedInterventionName = selectedIntervention?.name ?? interventionCode ?? '';

  useEffect(() => {
    if (!subBenefitCode) {
      setValue('interventionCode', null);
    }
  }, [subBenefitCode, setValue]);

  const buildBiometricStarter = useCallback(
    (crIdToUse: string, interventionCodeToUse: string, serviceType: string) => {
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
          patient_id: crIdToUse,
          interventions: [interventionCodeToUse],
          service_type: serviceType,
          workstation_id: workstationId,
          authorizing_device_os: deviceOs,
          patient_uuid: patientUuid,
        });

        if (!res.success || !res.embed_url || !res.token || !res.guid) {
          throw new Error(extractUpstreamError(res, t('biometricStartFailed', 'Could not start biometric session.')));
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
      if (!crId) {
        return { success: false, error: t('noCRNumber', 'Patient has no SHA CR number.') };
      }
      return submitOtpWhitelist({
        beneficiaryCrId: crId,
        reasonType: params.reasonType,
        reason: params.reason,
        biometricAttempts: params.biometricAttempts,
        attachment: params.attachment ?? undefined,
      });
    },
    [crId, t],
  );

  const handleCheckWhitelistStatus = useCallback(async (crIdToCheck: string) => {
    const status = await fetchWhitelistStatus(crIdToCheck);
    return {
      is_whitelisted: status.is_whitelisted,
      has_pending: status.has_pending,
      is_rejected: status.is_rejected,
      latest_status: status.latest_status,
      reviewer_note: status.requests?.[0]?.reviewer_note ?? null,
    };
  }, []);

  const handleAuthorize = useCallback(
    (data: ElectivePreAuthFormData) => {
      if (!crId) {
        setAuthorizeError(t('selectPatientWithCR', 'Please select a patient with a SHA CR ID'));
        return;
      }
      if (!data.interventionCode) {
        setAuthorizeError(t('selectIntervention', 'Please select an intervention'));
        return;
      }
      if (isCoverageExhausted) {
        setAuthorizeError(
          utilization?.message ??
            t(
              'coverageExhaustedSubtitle',
              'The coverage limit for {{name}} ({{code}}) has been exhausted. Choose another intervention to proceed.',
              { name: selectedInterventionName, code: data.interventionCode },
            ),
        );
        return;
      }
      setAuthorizeError('');
      setIsAuthorizing(true);

      let isAuthorized = false;

      const interventionCodeToUse = data.interventionCode;
      const intervention = interventions.find((i) => i.code === interventionCodeToUse);
      const interventionName = intervention?.name ?? '';
      const interventionTariff = (intervention as any)?.tariff ?? '';
      const interventionDocTypes = (intervention as any)?.applicable_document_types ?? [];
      const interventionPreauthType = (intervention as any)?.preauth_type ?? '';
      const interventionNumberOfDoctorsRequired = intervention?.number_of_doctors_required ?? null;

      const runAuthorization = async (authParams: { otp: string } | { authGuid: string }) => {
        const res = await createElectiveAuthorization(
          crId,
          authParams,
          interventionCodeToUse,
          data.patientUuid,
          data.serviceType,
          interventionName,
          interventionTariff,
          interventionDocTypes,
          interventionPreauthType,
          interventionNumberOfDoctorsRequired,
        );
        if (!res.success) {
          throw new Error(extractUpstreamError(res, t('authorizeFailed', 'Authorization failed')));
        }
        isAuthorized = true;
      };

      const handleAuthorizationSuccess = () => {
        setIsAuthorizing(false);
        showSnackbar({
          title: t('electiveDraftCreated', 'Elective draft created'),
          subtitle: t(
            'electiveDraftSubtitle',
            'Authorization obtained. The elective preauth now appears in the Scheduled tab. Open the row to submit the preauth to SHA.',
          ),
          kind: 'success',
        });
        handleMutation(`${virtualClaimBaseUrl}/preauth-queue`);
        mutate?.();
        closeWorkspaceWithSavedChanges();
      };

      const dispose = showModal('otp-verification-modal', {
        onClose: () => {
          if (!isAuthorized) {
            setIsAuthorizing(false);
          }
          dispose();
        },
        phoneNumber: patientPhone || '',
        otpLength: 6,
        expiryMinutes: 5,
        centerBoxes: true,

        onRequestOtp: async (_phone: string) => {
          const res = await sendSHAOtp(crId, [interventionCodeToUse]);
          if (!res.success) {
            throw new Error(extractUpstreamError(res, t('otpFailed', 'Failed to send OTP')));
          }
        },

        onVerify: async (enteredOtp: string) => {
          await runAuthorization({ otp: enteredOtp });
        },

        onVerificationSuccess: () => {
          dispose();
          handleAuthorizationSuccess();
        },

        onCleanup: () => {
          if (!isAuthorized) {
            setIsAuthorizing(false);
          }
        },

        authMode: 'multi',
        whitelistedForOTP: effectiveWhitelistedForOTP,
        facilityBiometricsEnforced: effectiveBiometricsEnforced,

        onStartBiometric: buildBiometricStarter(crId, interventionCodeToUse, data.serviceType),
        onCheckBiometricStatus: checkBiometricAuthorizationStatus,
        onBiometricSuccess: async (result: { authorization_code: string; consent_token: string; guid: string }) => {
          await runAuthorization({ authGuid: result.guid });
          dispose();
          handleAuthorizationSuccess();
        },
        onBiometricCancel: async (consentToken: string | null) => {
          if (consentToken) {
            try {
              await rejectBiometricAuthorization(consentToken);
            } catch (err) {
              throw new Error(
                extractUpstreamError(
                  err,
                  t('biometricCancelFailed', 'Failed to cancel biometric authorization. Please contact support.'),
                ),
              );
            }
          }
        },

        patientCRId: crId,
        whitelistReasons,
        onSubmitWhitelist: handleSubmitWhitelist,
        onCheckWhitelistStatus: handleCheckWhitelistStatus,
      });
    },
    [
      crId,
      patientPhone,
      interventions,
      isCoverageExhausted,
      utilization,
      selectedInterventionName,
      effectiveWhitelistedForOTP,
      effectiveBiometricsEnforced,
      buildBiometricStarter,
      whitelistReasons,
      handleSubmitWhitelist,
      handleCheckWhitelistStatus,
      mutate,
      closeWorkspace,
      t,
    ],
  );

  return (
    <Workspace2 title={workspaceTitle} hasUnsavedChanges={hasUnsavedChanges}>
      <Form className={styles.form} onSubmit={handleSubmit(handleAuthorize)}>
        <div className={styles.formBody}>
          <Stack gap={5}>
            <p className={styles.helperText}>
              {t(
                'electiveFormHelper',
                'Search for a patient, select an elective intervention, then authorize with the patient’s biometrics or an OTP. The elective preauth will appear in the Scheduled tab where you can submit it to SHA.',
              )}
            </p>

            <Controller
              control={control}
              name="patientUuid"
              render={({ field }) =>
                !field.value ? (
                  <>
                    <ExtensionSlot
                      name="patient-search-bar-slot"
                      state={{
                        selectPatientAction: (uuid: string) => {
                          field.onChange(uuid);
                          setValue('subBenefitCode', null);
                          setValue('interventionCode', null);
                        },
                        buttonProps: { kind: 'secondary' },
                      }}
                    />
                    {errors.patientUuid && (
                      <InlineNotification kind="error" lowContrast title={errors.patientUuid.message} />
                    )}
                  </>
                ) : (
                  <div className={styles.patientBannerWrapper}>
                    <PatientBanner patientUuid={field.value} />
                    <div className={styles.changeButton}>
                      <Button
                        kind="secondary"
                        size="sm"
                        onClick={() => {
                          field.onChange('');
                          setValue('subBenefitCode', null);
                          setValue('interventionCode', null);
                        }}>
                        {t('changePatient', 'Change patient')}
                      </Button>
                    </div>
                  </div>
                )
              }
            />

            {patientUuid && !crId && (
              <InlineNotification
                kind="warning"
                lowContrast
                title={t('noCRId', 'No SHA CR ID')}
                subtitle={t('noCRIdSubtitle', 'This patient does not have a SHA CR ID and cannot be authorized.')}
              />
            )}

            {crId && (
              <Layer>
                {loadingSubBenefits ? (
                  <InlineLoading description={t('loadingBenefits', 'Loading benefit packages...')} />
                ) : (
                  <Controller
                    control={control}
                    name="subBenefitCode"
                    render={({ field }) => {
                      const selectedItem = subBenefitItems.find((b) => b.code === field.value) ?? null;
                      return (
                        <>
                          <ComboBox
                            ref={field.ref}
                            id="elective-sub-benefit-combobox"
                            titleText={t('benefitPackage', 'Benefit package')}
                            placeholder={t('selectBenefitPackage', 'Select a benefit package')}
                            items={subBenefitItems}
                            itemToString={(item: SubBenefitItem | null) => (item ? item.label : '')}
                            selectedItem={selectedItem}
                            onChange={({ selectedItem }) => {
                              field.onChange(selectedItem ? selectedItem.code : null);
                              setValue('interventionCode', null);
                            }}
                            shouldFilterItem={({
                              item,
                              inputValue,
                            }: {
                              item: SubBenefitItem | null;
                              inputValue: string | null;
                            }) => {
                              if (!inputValue || !item) {
                                return true;
                              }
                              return item.label.toLowerCase().includes(inputValue.toLowerCase());
                            }}
                            invalid={!!errors.subBenefitCode}
                            invalidText={errors.subBenefitCode?.message}
                          />
                          {field.value && (
                            <div className={styles.tagsContainer}>
                              {(() => {
                                const benefit = subBenefits.find((b) => b.code === field.value);
                                return (
                                  <Tag key={field.value} type="blue" size="lg" className={styles.tag}>
                                    {benefit?.name ?? field.value}
                                  </Tag>
                                );
                              })()}
                            </div>
                          )}
                        </>
                      );
                    }}
                  />
                )}
              </Layer>
            )}

            {subBenefitCode && (
              <Layer>
                {loadingInterventions ? (
                  <InlineLoading status="active" description={t('loadingInterventions', 'Loading interventions...')} />
                ) : (
                  <Controller
                    control={control}
                    name="interventionCode"
                    render={({ field }) => {
                      const selectedItem = interventionItems.find((i) => i.code === field.value) ?? null;

                      return (
                        <>
                          <ComboBox
                            ref={field.ref}
                            id="elective-form-intervention"
                            titleText={t('intervention', 'Intervention')}
                            placeholder={t('chooseIntervention', 'Choose an intervention')}
                            items={interventionItems}
                            itemToString={(i: InterventionItem | null) => (i ? i.text : '')}
                            selectedItem={selectedItem}
                            helperText={
                              electiveCount > 0
                                ? t(
                                    'nonElectiveDisabledHint',
                                    'Only elective interventions can be selected here. Use a normal visit for others.',
                                  )
                                : undefined
                            }
                            onChange={({ selectedItem }) => {
                              if (selectedItem && !selectedItem.disabled) {
                                field.onChange(selectedItem.code);
                              } else if (!selectedItem) {
                                field.onChange(null);
                              }
                            }}
                            shouldFilterItem={({
                              item,
                              inputValue,
                            }: {
                              item: InterventionItem | null;
                              inputValue: string | null;
                            }) => {
                              if (!inputValue || !item) {
                                return true;
                              }
                              return item.text.toLowerCase().includes(inputValue.toLowerCase());
                            }}
                            invalid={!!errors.interventionCode}
                            invalidText={errors.interventionCode?.message}
                          />
                          {field.value && (
                            <div className={styles.tagsContainer}>
                              {(() => {
                                const intervention = interventions.find((i) => i.code === field.value);
                                const name = intervention?.name ?? field.value;
                                const tariff = (intervention as any)?.tariff
                                  ? ` - ${formatCurrency(Number((intervention as any).tariff))}`
                                  : '';
                                return (
                                  <Tag key={field.value} type="cyan" size="lg" className={styles.tag}>
                                    {name}
                                    {tariff}: {t('electivePreauthRequired', 'Elective preauth required')}
                                  </Tag>
                                );
                              })()}
                            </div>
                          )}
                        </>
                      );
                    }}
                  />
                )}
              </Layer>
            )}

            {interventionCode && !loadingUtilization && !utilizationError && isCoverageExhausted && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                aria-label={t('coverageExhausted', 'Coverage exhausted')}
                title={t('cannotProceedElective', 'Cannot create elective preauth')}
                subtitle={
                  utilization?.message ??
                  t(
                    'coverageExhaustedSubtitle',
                    'The coverage limit for {{name}} ({{code}}) has been exhausted. Choose another intervention to proceed.',
                    { name: selectedInterventionName, code: interventionCode },
                  )
                }
              />
            )}

            {interventionCode && (
              <Layer>
                <Controller
                  control={control}
                  name="serviceType"
                  render={({ field }) => (
                    <Select
                      id="elective-service-type"
                      labelText={t('serviceType', 'Service type')}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}>
                      <SelectItem value="OUTPATIENT" text={t('outpatient', 'Outpatient')} />
                      <SelectItem value="INPATIENT" text={t('inpatient', 'Inpatient')} />
                    </Select>
                  )}
                />
              </Layer>
            )}

            {authorizeError && <InlineNotification kind="error" lowContrast title={authorizeError} />}
          </Stack>
        </div>

        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            className={styles.button}
            kind="primary"
            type="submit"
            disabled={isAuthorizing || !crId || !interventionCode || isCoverageExhausted || loadingUtilization}>
            {isAuthorizing ? (
              <InlineLoading description={t('authorizing', 'Authorizing...')} />
            ) : isCoverageExhausted ? (
              t('coverageExhausted', 'Coverage exhausted')
            ) : canUseOtp ? (
              t('authorizeWithOtpOrBiometrics', 'Authorize (OTP or biometrics)')
            ) : (
              t('authorizeWithBiometrics', 'Authorize with biometrics')
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default ElectivePreAuthForm;
