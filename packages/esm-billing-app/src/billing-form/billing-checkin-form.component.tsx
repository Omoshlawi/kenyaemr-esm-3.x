import {
  FilterableMultiSelect,
  InlineLoading,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
  Tag,
  TextInput,
} from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  showModal,
  showSnackbar,
  useConfig,
  useFeatureFlag,
  usePatient,
  useSession,
  type Visit,
} from '@openmrs/esm-framework';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { createPatientBill, createVisitAttribute, useBillableItems, useCashPoint } from '../billing.resource';
import { BillingConfig } from '../config-schema';
import { EXEMPTED_PAYMENT_STATUS, PENDING_PAYMENT_STATUS, SHA_INSURANCE_SCHEME } from '../constants';
import styles from './billing-checkin-form.scss';
import { visitAttributesFormSchema, VisitAttributesFormValue } from './check-in-form.utils';
import { hasPatientBeenExempted } from './helper';
import SHANumberValidity from './social-health-authority/sha-number-validity.component';
import VisitAttributesForm from './visit-attributes/visit-attributes-form.component';
import SHABenefitPackagesAndInterventions from '../benefits-package/forms/packages-and-interventions-form.component';
import {
  addVisitAttribute,
  checkBiometricAuthorizationStatus,
  createSHABiometricAuthorize,
  createSHAVirtualClaim,
  detectAuthorizingDeviceOS,
  fetchWhitelistStatus,
  linkVisitToClaim,
  rejectBiometricAuthorization,
  sendSHAOtp,
  submitOtpWhitelist,
  useBiometricAgentStatus,
  useBiometricConfig,
  useElectiveCheckin,
  useOtpWhitelistReasons,
  usePatientPhone,
  useProviderNationalId,
} from './social-health-authority/sha-virtual-claim.resource';
import { type SHAIntervention, VirtualClaimResponse } from './social-health-authority/type';
import { getPatientCRNumber, toSavannahISO } from './social-health-authority/helper';
import { extractUpstreamError } from '../claims/claims-management/table/virtual-claim-preauth/utils';
import { formatCurrency } from '../helpers/currency';
import { useSHAEligibility } from './hie.resource';

export interface VisitFormCallbacks {
  onVisitCreatedOrUpdated: (visit: Visit) => Promise<any>;
  onBeforeVisitSave?: () => Promise<boolean>;
  isSHAVisit?: boolean;
  isElectiveNotApproved?: boolean;
  /** When true, the visit form's submit button should be disabled. */
  isCoverageExhausted?: boolean;
}

type BillingCheckInFormProps = {
  patientUuid: string;
  setVisitFormCallbacks: (callbacks: VisitFormCallbacks) => void;
  visitFormOpenedFrom?: string;
  visitTypeUuid?: string;
  visitStatus: string;
};

type BillingCheckInFormValue = VisitAttributesFormValue & {
  admissionDate: Date | null;
  estimatedDaysOfAdmission: number;
};
function extractAuthorizationCode(claimResponse: any): string | null {
  if (!claimResponse) {
    return null;
  }
  const candidates = [
    claimResponse.authorization_code,
    claimResponse.claim?.authorization_code,
    claimResponse.consent_token,
    claimResponse.claim?.consent_token,
    claimResponse.data?.authorization_code,
    claimResponse.data?.claim?.authorization_code,
    claimResponse.authorizationCode,
    claimResponse.claim?.authorizationCode,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
  }
  return null;
}

const BillingCheckInForm: React.FC<BillingCheckInFormProps> = ({
  patientUuid,
  setVisitFormCallbacks,
  visitStatus,
  visitTypeUuid,
}) => {
  const { t } = useTranslation();
  const hieFeatureFlags = useFeatureFlag('healthInformationExchange');
  const {
    visitAttributeTypes: { isPatientExempted, claimScheme },
    inPatientVisitTypeUuid,
    crIdentificationNumberUUID,
    enableSHAVerification,
  } = useConfig<BillingConfig>();
  const shaEnabled = hieFeatureFlags && enableSHAVerification;

  const { patient } = usePatient(patientUuid);
  const phoneNumber = usePatientPhone(patientUuid);

  const patientCRId = useMemo(
    () => getPatientCRNumber(patient as fhir.Patient, crIdentificationNumberUUID),
    [patient, crIdentificationNumberUUID],
  );

  const { isPatientWhiteListed, facilityBiometricsEnforced } = useSHAEligibility(patientUuid);
  const { reasons: whitelistReasons } = useOtpWhitelistReasons();

  const { currentProvider } = useSession();
  const { providerNationalid } = useProviderNationalId(currentProvider?.uuid ?? '');
  const { agentUrl } = useBiometricConfig();
  const { workstationId } = useBiometricAgentStatus(agentUrl);
  const deviceOs = detectAuthorizingDeviceOS();

  const { cashPoints, isLoading: isLoadingCashPoints, error: cashError } = useCashPoint();
  const { lineItems, isLoading: isLoadingLineItems, error: lineError } = useBillableItems();

  const [attributes, setAttributes] = useState<Array<{ attributeType: string; value: string }>>([]);
  const [selectedBillingServices, setSelectedBillingServices] = useState<Array<any>>([]);

  const [isElectiveVisit, setIsElectiveVisit] = useState<'yes' | 'no'>('no');
  const [electiveConsentToken, setElectiveConsentToken] = useState('');

  const [isCoverageExhausted, setIsCoverageExhausted] = useState(false);

  const {
    electiveRecord,
    isLoading: isLoadingElective,
    isApproved,
    isAlreadyUsed,
  } = useElectiveCheckin(isElectiveVisit === 'yes' ? electiveConsentToken : null);

  const isElectiveNotApproved = isElectiveVisit === 'yes' && (!electiveRecord || !isApproved || isAlreadyUsed);

  const patientCRIdRef = useRef<string | null>(null);
  const interventionCodesRef = useRef<string[]>([]);
  const serviceTypeRef = useRef<string>('OUTPATIENT');
  const admissionDateRef = useRef<Date | null>(null);
  const estimatedDaysRef = useRef<number | null>(null);
  const shaClaimResponseRef = useRef<VirtualClaimResponse | null>(null);
  const interventionCacheRef = useRef<Record<string, SHAIntervention>>({});
  const paymentMechanismRef = useRef<string | undefined>(undefined);

  const formMethods = useForm<BillingCheckInFormValue>({
    mode: 'all',
    defaultValues: {
      isPatientExempted: '',
      paymentMethods: '',
      insuranceScheme: '',
      policyNumber: '',
      exemptionCategory: '',
      interventions: null,
      packages: null,
      admissionDate: null,
      estimatedDaysOfAdmission: 1,
    },
    resolver: zodResolver(visitAttributesFormSchema),
  });

  const isPatientExemptedValue = formMethods.watch('isPatientExempted');
  const paymentMethod = formMethods.watch('paymentMethods');
  const isInsuranceSchemeSha = formMethods.watch('insuranceScheme') === SHA_INSURANCE_SCHEME;
  const selectedIntervention = formMethods.watch('interventions') as string | null;
  const admissionDate = formMethods.watch('admissionDate');
  const estimatedDays = formMethods.watch('estimatedDaysOfAdmission');

  useEffect(() => {
    serviceTypeRef.current = visitTypeUuid === inPatientVisitTypeUuid ? 'INPATIENT' : 'OUTPATIENT';
  }, [visitTypeUuid, inPatientVisitTypeUuid]);

  useEffect(() => {
    admissionDateRef.current = admissionDate ?? null;
  }, [admissionDate]);
  useEffect(() => {
    estimatedDaysRef.current = estimatedDays ?? null;
  }, [estimatedDays]);

  useEffect(() => {
    if (!isInsuranceSchemeSha || isElectiveVisit === 'yes') {
      setIsCoverageExhausted(false);
    }
  }, [isInsuranceSchemeSha, isElectiveVisit]);

  const handleUtilizationStatusChange = useCallback((isExhausted: boolean) => {
    setIsCoverageExhausted(isExhausted);
  }, []);

  const resolvePaymentMechanism = useCallback((codes: string[]): string | undefined => {
    if (codes.length === 0) {
      return undefined;
    }
    const allCapitation = codes.every((code) => {
      const int = interventionCacheRef.current[code];
      return int?.payment_mechanism?.toUpperCase() === 'CAPITATION';
    });
    return allCapitation ? 'CAPITATION' : undefined;
  }, []);

  const handleCreateBill = useCallback(
    (billPayload: Record<string, any>) => {
      return createPatientBill(billPayload).then(
        () => {
          showSnackbar({
            title: t('patientBill', 'Patient Bill'),
            subtitle: t('patientBilledSuccessfully', 'Patient has been billed successfully'),
            kind: 'success',
          });
        },
        (error) => {
          const errorMessage = JSON.stringify(
            error?.responseBody?.error?.message?.replace(/\[/g, '').replace(/\]/g, '') || '',
          );
          showSnackbar({
            title: t('patientBillError', 'Patient Bill Error'),
            subtitle: t(
              'errorCreatingBill',
              'An error has occurred while creating patient bill, Contact system administrator quoting this error {{errorMessage}}',
              { errorMessage },
            ),
            kind: 'error',
            isLowContrast: true,
          });
          throw error;
        },
      );
    },
    [t],
  );

  const createBillPayload = useCallback(
    (selectedItems: Array<any>) => {
      const cashPointUuid = cashPoints?.[0]?.uuid ?? '';
      const billStatus = hasPatientBeenExempted(attributes, isPatientExempted)
        ? EXEMPTED_PAYMENT_STATUS
        : PENDING_PAYMENT_STATUS;
      const lineItemsData = selectedItems.map((item, index) => {
        const priceForPaymentMode =
          item.servicePrices.find((p) => p.paymentMode?.uuid === paymentMethod) || item?.servicePrices[0];
        return {
          billableService: item?.uuid ?? '',
          quantity: 1,
          price: priceForPaymentMode ? priceForPaymentMode.price : '0.00',
          priceName: 'Default',
          priceUuid: priceForPaymentMode ? priceForPaymentMode.uuid : '',
          lineItemOrder: index,
          paymentStatus: billStatus,
        };
      });
      return {
        lineItems: lineItemsData,
        cashPoint: cashPointUuid,
        patient: patientUuid,
        status: billStatus,
        payments: [],
      };
    },
    [cashPoints, attributes, isPatientExempted, paymentMethod, patientUuid],
  );

  const handleBillingService = useCallback((selectedItems: Array<any>) => {
    setSelectedBillingServices(selectedItems);
  }, []);

  const buildBiometricStarter = useCallback(
    (crId: string, codes: string[], paymentMechanism: string | undefined) => {
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
          interventions: codes,
          service_type: serviceTypeRef.current,
          workstation_id: workstationId,
          authorizing_device_os: deviceOs,
          payment_mechanism: paymentMechanism,
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
      is_rejected: (status as any).is_rejected,
      latest_status: status.latest_status,
      reviewer_note: (status as any).reviewer_note,
    };
  }, []);

  const launchSHAOtpFlow = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!shaEnabled || !isInsuranceSchemeSha) {
        resolve(true);
        return;
      }

      if (!patientCRId) {
        showSnackbar({
          title: t('shaVirtualClaim', 'SHA Virtual Claim'),
          subtitle: t('noCRNumber', 'Patient has no SHA CR number. Proceeding without virtual claim.'),
          kind: 'warning',
        });
        resolve(true);
        return;
      }

      const electiveAuthCodeForRequest = isElectiveVisit === 'yes' ? electiveConsentToken : undefined;

      const buildModalConfig = (crIdToUse: string, codes: string[], paymentMechanism: string | undefined): void => {
        let settled = false;
        const runVirtualClaim = async (authParams: { otp: string } | { authGuid: string }) => {
          const isInpatient = serviceTypeRef.current === 'INPATIENT';
          const claimResponse = await createSHAVirtualClaim(
            patientCRIdRef.current!,
            authParams,
            serviceTypeRef.current,
            interventionCodesRef.current,
            '',
            patientUuid,
            paymentMechanism,
            electiveAuthCodeForRequest,
          );
          if (!claimResponse.success) {
            throw new Error(
              extractUpstreamError(claimResponse as any, t('virtualClaimFailed', 'SHA virtual claim failed.')),
            );
          }
          const authCheck = extractAuthorizationCode(claimResponse);
          if (!authCheck) {
            throw new Error(
              t(
                'virtualClaimNoAuthCode',
                'SHA returned a claim with no authorization code. Cannot proceed — please retry.',
              ),
            );
          }

          shaClaimResponseRef.current = claimResponse;
          return claimResponse;
        };

        const dispose = showModal('otp-verification-modal', {
          onClose: () => {
            if (!settled) {
              settled = true;
              dispose();
              resolve(false);
            } else {
              dispose();
            }
          },

          phoneNumber,
          otpLength: 6,
          expiryMinutes: 5,
          centerBoxes: true,

          onRequestOtp: async () => {
            const res = await sendSHAOtp(crIdToUse, codes);
            if (!res.success) {
              throw new Error(extractUpstreamError(res as any, t('otpRequestFailed', 'Failed to send OTP')));
            }
          },
          onVerify: async (enteredOtp: string) => {
            await runVirtualClaim({ otp: enteredOtp });
          },
          onVerificationSuccess: () => {
            settled = true;
            dispose();
            resolve(true);
          },

          onCleanup: () => {
            if (!settled) {
              settled = true;
              resolve(false);
            }
          },

          authMode: 'multi',
          whitelistedForOTP: isPatientWhiteListed,
          facilityBiometricsEnforced,

          // Biometric path
          onStartBiometric: buildBiometricStarter(crIdToUse, codes, paymentMechanism),
          onCheckBiometricStatus: checkBiometricAuthorizationStatus,
          onBiometricSuccess: async (result: { authorization_code: string; consent_token: string; guid: string }) => {
            await runVirtualClaim({ authGuid: result.guid });
            settled = true;
            dispose();
            resolve(true);
          },
          onBiometricCancel: async (consentToken: string | null) => {
            if (consentToken) {
              try {
                await rejectBiometricAuthorization(consentToken);
              } catch (err) {
                throw new Error(
                  extractUpstreamError(
                    err as any,
                    t('biometricCancelFailed', 'Failed to cancel biometric authorization. Please contact support.'),
                  ),
                );
              }
            }
          },

          patientCRId: crIdToUse,
          whitelistReasons,
          onSubmitWhitelist: handleSubmitWhitelist,
          onCheckWhitelistStatus: handleCheckWhitelistStatus,
        });
      };

      if (isElectiveVisit === 'yes') {
        if (!electiveRecord) {
          showSnackbar({
            title: t('shaElectiveCheckin', 'Elective Check-in'),
            subtitle: t('electiveRecordNotFound', 'Elective preauth not found. Please verify the authorization code.'),
            kind: 'error',
          });
          resolve(false);
          return;
        }
        if (!isApproved) {
          showSnackbar({
            title: t('shaElectiveCheckin', 'Elective Check-in'),
            subtitle: t(
              'electivePreauthNotApproved',
              'Elective preauth is not yet approved ({{state}}). Cannot check in.',
              { state: electiveRecord.workflow_state },
            ),
            kind: 'warning',
          });
          resolve(false);
          return;
        }

        const electedCRId = electiveRecord.elective_patient_cr_id ?? patientCRId;
        const codes = electiveRecord.elective_intervention_code
          ? [electiveRecord.elective_intervention_code]
          : electiveRecord.intervention_code
          ? [electiveRecord.intervention_code]
          : [''];

        patientCRIdRef.current = electedCRId;
        interventionCodesRef.current = codes;
        serviceTypeRef.current = electiveRecord.service_type ?? 'OUTPATIENT';
        paymentMechanismRef.current = undefined;

        buildModalConfig(electedCRId, codes, undefined);
        return;
      }

      const codes = selectedIntervention ? [selectedIntervention] : [''];
      patientCRIdRef.current = patientCRId;
      interventionCodesRef.current = codes;
      const paymentMechanism = resolvePaymentMechanism(codes);
      paymentMechanismRef.current = paymentMechanism;

      buildModalConfig(patientCRId, codes, paymentMechanism);
    });
  }, [
    shaEnabled,
    isInsuranceSchemeSha,
    patientCRId,
    isPatientWhiteListed,
    facilityBiometricsEnforced,
    whitelistReasons,
    phoneNumber,
    selectedIntervention,
    isElectiveVisit,
    electiveRecord,
    isApproved,
    electiveConsentToken,
    patientUuid,
    resolvePaymentMechanism,
    buildBiometricStarter,
    handleSubmitWhitelist,
    handleCheckWhitelistStatus,
    t,
  ]);

  useEffect(() => {
    const onVisitCreatedOrUpdated = async (visit: Visit) => {
      if (visitStatus === 'past') {
        return visit;
      }
      const claimResponse = shaClaimResponseRef.current;
      const capturedPaymentMechanism = paymentMechanismRef.current;

      try {
        if (attributes.length > 0) {
          try {
            await Promise.all(
              attributes.map((attr) => createVisitAttribute(visit.uuid, attr.attributeType, attr.value)),
            );
          } catch (error) {
            showSnackbar({
              title: t('visitAttributesError', 'Visit Attributes Error'),
              subtitle: t('errorSavingVisitAttributes', 'An error occurred while saving billing visit attributes.'),
              kind: 'error',
              isLowContrast: true,
            });
            throw error;
          }
        }

        if (selectedBillingServices.length > 0) {
          const billPayload = createBillPayload(selectedBillingServices);
          await handleCreateBill(billPayload);
        }

        if (shaEnabled && isInsuranceSchemeSha && shaClaimResponseRef.current) {
          const claimResponse = shaClaimResponseRef.current;
          const authCode = claimResponse.authorization_code ?? claimResponse.claim?.authorization_code;

          if (!authCode) {
            showSnackbar({
              title: t('shaVirtualClaim', 'SHA Virtual Claim'),
              subtitle: t(
                'claimLinkNoAuthCode',
                'Virtual claim created but could not be linked to the visit (missing authorization code). ' +
                  'Diagnoses may not sync — contact support.',
              ),
              kind: 'warning',
              timeoutInMs: 10000,
            });
          } else if (!visit?.uuid) {
            showSnackbar({
              title: t('shaVirtualClaim', 'SHA Virtual Claim'),
              subtitle: t(
                'claimLinkNoVisitUuid',
                'Virtual claim created but the visit has no UUID to link against. Diagnoses may not sync.',
              ),
              kind: 'warning',
              timeoutInMs: 10000,
            });
          } else {
            try {
              const linkResult = await linkVisitToClaim(authCode, visit.uuid, patientUuid);
              if (!(linkResult as any)?.success) {
                throw new Error((linkResult as any)?.error ?? 'link-visit returned success=false');
              }
              const effectivePaymentMechanism =
                capturedPaymentMechanism ?? claimResponse.claim?.payment_mechanism ?? electiveRecord?.payment_mechanism;
              const claimFundValue = effectivePaymentMechanism?.toUpperCase() === 'CAPITATION' ? 'PHC' : 'SHIF';

              await addVisitAttribute(visit.uuid, claimScheme, claimFundValue);
            } catch (err) {
              showSnackbar({
                title: t('shaVirtualClaim', 'SHA Virtual Claim'),
                subtitle: t(
                  'claimLinkFailed',
                  'Virtual claim created but linking to the visit failed: {{error}}. Diagnoses may not sync.',
                  { error: err instanceof Error ? err.message : String(err) },
                ),
                kind: 'error',
                timeoutInMs: 10000,
              });
            }
          }

          const needsPreauth = claimResponse.claim?.interventions?.some((i: any) => i.needs_preauth);
          showSnackbar({
            title: t('shaVirtualClaim', 'SHA Virtual Claim'),
            subtitle:
              isElectiveVisit === 'yes'
                ? t('electiveVisitClaimCreated', 'Elective visit claim created successfully.')
                : needsPreauth
                ? t(
                    'virtualClaimCreatedPreauthRequired',
                    'Virtual claim created. Preauth required — check the preauth queue.',
                  )
                : t('virtualClaimCreated', 'Virtual claim created successfully.'),
            kind: 'success',
          });
        }

        return visit;
      } finally {
        if (claimResponse) {
          patientCRIdRef.current = null;
          interventionCodesRef.current = [];
          serviceTypeRef.current = 'OUTPATIENT';
          admissionDateRef.current = null;
          estimatedDaysRef.current = null;
          shaClaimResponseRef.current = null;
        }
      }
    };

    setVisitFormCallbacks({
      onVisitCreatedOrUpdated,
      onBeforeVisitSave: launchSHAOtpFlow,
      isSHAVisit: !!(shaEnabled && isInsuranceSchemeSha),
      isElectiveNotApproved,
      isCoverageExhausted: isCoverageExhausted && isInsuranceSchemeSha && isElectiveVisit === 'no',
    });
  }, [
    attributes,
    selectedBillingServices,
    createBillPayload,
    handleCreateBill,
    shaEnabled,
    isInsuranceSchemeSha,
    isElectiveVisit,
    launchSHAOtpFlow,
    patientUuid,
    setVisitFormCallbacks,
    t,
    isElectiveNotApproved,
    isCoverageExhausted,
    visitStatus,
    claimScheme,
    electiveRecord,
  ]);

  if (isLoadingLineItems || isLoadingCashPoints) {
    return (
      <InlineLoading
        status="active"
        iconDescription={t('loading', 'Loading')}
        description={t('loadingBillingServices', 'Loading billing services...')}
      />
    );
  }

  if (cashError || lineError) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        title={t('billErrorService', 'Bill service error')}
        subtitle={t('errorLoadingBillServices', 'Error loading bill services')}
      />
    );
  }

  if (visitStatus === 'past') {
    return null;
  }

  return (
    <FormProvider {...formMethods}>
      <VisitAttributesForm setAttributes={setAttributes} />
      {shaEnabled && <SHANumberValidity paymentMethod={attributes} patientUuid={patientUuid} />}

      {shaEnabled && isInsuranceSchemeSha && (
        <section className={styles.sectionContainer}>
          <div className={styles.sectionTitle}>{t('electiveVisitQuestion', 'Is this an elective visit?')}</div>
          <RadioButtonGroup
            name="is-elective-visit"
            valueSelected={isElectiveVisit}
            onChange={(val: string) => {
              setIsElectiveVisit(val as 'yes' | 'no');
              setElectiveConsentToken('');
            }}>
            <RadioButton labelText={t('notElective', 'No')} value="no" id="elective-no" />
            <RadioButton labelText={t('isElective', 'Yes')} value="yes" id="elective-yes" />
          </RadioButtonGroup>

          {isElectiveVisit === 'yes' && (
            <div className={styles.electiveAuthorizationContainer}>
              <TextInput
                id="elective-authorization-code"
                className={styles.electiveAuthorizationInput}
                labelText={t('authorizationCode', 'Authorization code')}
                helperText={t('authorizationCodeHelper', 'Enter the code issued during the scheduled preauthorization')}
                placeholder={t('authorizationCodePlaceholder', 'e.g. CMJ5RTHANG')}
                value={electiveConsentToken}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setElectiveConsentToken(event.target.value.trim().toUpperCase())
                }
              />

              {isLoadingElective && electiveConsentToken.length >= 6 && (
                <InlineLoading
                  className={styles.electiveAuthorizationFeedback}
                  description={t('verifyingAuthorizationCode', 'Verifying authorization code…')}
                />
              )}

              {!isLoadingElective && electiveRecord && (
                <div className={styles.electiveAuthorizationFeedback}>
                  <InlineNotification
                    aria-label={t('preauthorizationStatus', 'Preauthorization status')}
                    kind={isApproved ? 'success' : 'warning'}
                    lowContrast
                    title={
                      isApproved
                        ? t('preauthorizationApproved', 'Authorization verified — ready for check-in')
                        : t('preauthorizationPending', 'Authorization pending SHA approval')
                    }
                    subtitle={
                      isApproved
                        ? t('preauthorizationApprovedSubtitle', 'SHA has approved this preauth. Proceed to send OTP.')
                        : t(
                            'preauthorizationPendingDetails',
                            'Current status: {{state}}. Please wait for SHA approval before check-in.',
                            { state: (electiveRecord.workflow_state ?? '').replace(/_/g, ' ') },
                          )
                    }
                  />
                  <div className={styles.electiveInterventionCard}>
                    <div className={styles.electiveInterventionRow}>
                      <span className={styles.electiveInterventionLabel}>{t('intervention', 'Intervention')}</span>
                      <span className={styles.electiveInterventionValue}>
                        {electiveRecord.intervention_name ||
                          electiveRecord.elective_intervention_code ||
                          electiveRecord.intervention_code ||
                          '—'}
                      </span>
                    </div>
                    <div className={styles.electiveInterventionRow}>
                      <span className={styles.electiveInterventionLabel}>{t('code', 'Code')}</span>
                      <span className={styles.electiveInterventionValueMono}>
                        {electiveRecord.elective_intervention_code ?? electiveRecord.intervention_code ?? '—'}
                      </span>
                    </div>
                    {electiveRecord.service_type && (
                      <div className={styles.electiveInterventionRow}>
                        <span className={styles.electiveInterventionLabel}>{t('serviceType', 'Service type')}</span>
                        <span className={styles.electiveInterventionValue}>
                          <Tag type="blue" size="sm">
                            {electiveRecord.service_type}
                          </Tag>
                        </span>
                      </div>
                    )}
                    <div className={styles.electiveInterventionRow}>
                      <span className={styles.electiveInterventionLabel}>{t('status', 'Status')}</span>
                      <span className={styles.electiveInterventionValue}>
                        <Tag
                          type={
                            isApproved
                              ? 'green'
                              : electiveRecord.workflow_state?.includes('REJECTED')
                              ? 'red'
                              : 'warm-gray'
                          }
                          size="sm">
                          {(electiveRecord.workflow_state ?? '—').replace('ELECTIVE_', '')}
                        </Tag>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!isLoadingElective && isAlreadyUsed && (
                <InlineNotification
                  aria-label={t('authCodeAlreadyUsed', 'Authorization code already used')}
                  className={styles.electiveAuthorizationFeedback}
                  kind="error"
                  lowContrast
                  title={t('authCodeAlreadyUsed', 'Authorization code already used')}
                  subtitle={t(
                    'authCodeAlreadyUsedSubtitle',
                    'This code has already been used to create a claim. Each authorization code can only be used once.',
                  )}
                />
              )}

              {!isLoadingElective && !isAlreadyUsed && electiveConsentToken.length >= 6 && !electiveRecord && (
                <InlineNotification
                  aria-label={t('electiveRecordNotFound', 'Elective record not found')}
                  className={styles.electiveAuthorizationFeedback}
                  kind="error"
                  lowContrast
                  title={t('electiveNotFound', 'No elective record found')}
                  subtitle={t('checkAuthorizationCode', 'Please verify the authorization code and try again.')}
                />
              )}
            </div>
          )}
        </section>
      )}

      {shaEnabled && isInsuranceSchemeSha && isElectiveVisit === 'no' && (
        <SHABenefitPackagesAndInterventions
          patientUuid={patientUuid}
          visitTypeUuid={visitTypeUuid}
          onInterventionsCached={(cache) => {
            interventionCacheRef.current = { ...interventionCacheRef.current, ...cache };
          }}
          onUtilizationStatusChange={handleUtilizationStatusChange}
        />
      )}

      {paymentMethod && (
        <section className={styles.sectionContainer}>
          <div className={styles.sectionTitle}>{t('chargeableService', 'Chargeable service')}</div>
          <div className={styles.sectionField}>
            <FilterableMultiSelect
              key={isPatientExemptedValue}
              id="billing-service"
              titleText={t('searchServices', 'Search services')}
              items={lineItems ?? []}
              itemToString={(item) => (item ? item?.name : '')}
              onChange={({ selectedItems }) => handleBillingService(selectedItems)}
              disabled={isPatientExemptedValue === ''}
            />
          </div>
        </section>
      )}
    </FormProvider>
  );
};

export default React.memo(BillingCheckInForm);
