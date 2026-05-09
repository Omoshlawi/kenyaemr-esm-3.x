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
import { showModal, showSnackbar, useConfig, useFeatureFlag, usePatient, type Visit } from '@openmrs/esm-framework';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  createSHABiometricAuthorize,
  createSHAVirtualClaim,
  linkVisitToClaim,
  sendSHAOtp,
  useElectiveCheckin,
  usePatientPhone,
} from './social-health-authority/sha-virtual-claim.resource';
import { type SHAIntervention, VirtualClaimResponse } from './social-health-authority/type';
import { getPatientCRNumber, toSavannahISO } from './social-health-authority/helper';
import { extractFetchError, extractUpstreamError } from '../claims/claims-management/table/virtual-claim-preauth/utils';
import { formatCurrency } from '../helpers/currency';

export interface VisitFormCallbacks {
  onVisitCreatedOrUpdated: (visit: Visit) => Promise<any>;
  onBeforeVisitSave?: () => Promise<boolean>;
  isSHAVisit?: boolean;
  isElectiveNotApproved?: boolean;
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

// ── TEMPORARY FALLBACKS ──
// Replace once real wiring is in place:
//   - Workstation ID: fetch from local biometric agent (http://localhost:18065/status/)
//   - Agent ID: National ID of the logged-in OpenMRS user (person attribute)
const FALLBACK_WORKSTATION_ID = '8e4824b9-729c-490d-97b4-74409721c6ef-7066553AB4E5';
const FALLBACK_AGENT_ID = '12345678';

const BillingCheckInForm: React.FC<BillingCheckInFormProps> = ({
  patientUuid,
  setVisitFormCallbacks,
  visitStatus,
  visitTypeUuid,
}) => {
  const { t } = useTranslation();
  const hieFeatureFlags = useFeatureFlag('healthInformationExchange');
  const {
    visitAttributeTypes: { isPatientExempted },
    inPatientVisitTypeUuid,
    crIdentificationNumberUUID,
  } = useConfig<BillingConfig>();

  const { patient } = usePatient(patientUuid);
  const phoneNumber = usePatientPhone(patientUuid);
  const { cashPoints, isLoading: isLoadingCashPoints, error: cashError } = useCashPoint();
  const { lineItems, isLoading: isLoadingLineItems, error: lineError } = useBillableItems();

  const [attributes, setAttributes] = useState<Array<{ attributeType: string; value: string }>>([]);
  const [selectedBillingServices, setSelectedBillingServices] = useState<Array<any>>([]);

  const [isElectiveVisit, setIsElectiveVisit] = useState<'yes' | 'no'>('no');
  const [electiveConsentToken, setElectiveConsentToken] = useState('');

  const {
    electiveRecord,
    isLoading: isLoadingElective,
    isApproved,
    isAlreadyUsed,
  } = useElectiveCheckin(isElectiveVisit === 'yes' ? electiveConsentToken : null);

  const isElectiveNotApproved = isElectiveVisit === 'yes' && (!electiveRecord || !isApproved || isAlreadyUsed);

  const verifiedOtpRef = useRef<string | null>(null);
  const patientCRIdRef = useRef<string | null>(null);
  const interventionCodesRef = useRef<string[]>([]);
  const serviceTypeRef = useRef<string>('OUTPATIENT');
  const admissionDateRef = useRef<Date | null>(null);
  const estimatedDaysRef = useRef<number | null>(null);
  const shaClaimResponseRef = useRef<VirtualClaimResponse | null>(null);
  const interventionCacheRef = useRef<Record<string, SHAIntervention>>({});

  const formMethods = useForm<BillingCheckInFormValue>({
    mode: 'all',
    defaultValues: {
      isPatientExempted: '',
      paymentMethods: '',
      insuranceScheme: '',
      policyNumber: '',
      exemptionCategory: '',
      interventions: [],
      packages: [],
      admissionDate: null,
      estimatedDaysOfAdmission: 1,
    },
    resolver: zodResolver(visitAttributesFormSchema),
  });

  const isPatientExemptedValue = formMethods.watch('isPatientExempted');
  const paymentMethod = formMethods.watch('paymentMethods');
  const isInsuranceSchemeSha = formMethods.watch('insuranceScheme') === SHA_INSURANCE_SCHEME;
  const selectedInterventions = formMethods.watch('interventions') as string[];
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
          price: priceForPaymentMode ? priceForPaymentMode.price : '0.000',
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
        const res = await createSHABiometricAuthorize({
          agent_id: FALLBACK_AGENT_ID,
          patient_id: crId,
          interventions: codes,
          service_type: serviceTypeRef.current,
          workstation_id: FALLBACK_WORKSTATION_ID,
          authorizing_device_os: 'windows',
          payment_mechanism: paymentMechanism,
          patient_uuid: patientUuid,
        });

        if (!res.success || !res.embed_url) {
          throw new Error(
            extractUpstreamError(res as any, t('biometricStartFailed', 'Could not start biometric session.')),
          );
        }

        return {
          embed_url: res.embed_url,
          authorization_code: res.authorization_code ?? '',
          consent_token: res.consent_token ?? '',
        };
      };
    },
    [patientUuid, t],
  );

  const handleRequestWhitelist = useCallback(() => {
    showSnackbar({
      title: t('whitelistRequest', 'Whitelist request'),
      subtitle: t('whitelistRequestStub', 'Whitelist submission modal not yet implemented. The request would go here.'),
      kind: 'info',
    });
    // TODO: launch WhitelistSubmissionModal({ patientCRId: patientCRIdRef.current, patientUuid });
  }, [t]);

  const handleReject = useCallback(() => {
    showSnackbar({
      title: t('authRejected', 'Authentication rejected'),
      subtitle: t('authRejectedSubtitle', 'Visit will proceed without SHA virtual claim. This may affect billing.'),
      kind: 'warning',
    });
  }, [t]);

  const launchSHAOtpFlow = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!hieFeatureFlags || !isInsuranceSchemeSha) {
        resolve(true);
        return;
      }

      const patientCRId = getPatientCRNumber(patient as fhir.Patient, crIdentificationNumberUUID);
      if (!patientCRId) {
        showSnackbar({
          title: t('shaVirtualClaim', 'SHA Virtual Claim'),
          subtitle: t('noCRNumber', 'Patient has no SHA CR number. Proceeding without virtual claim.'),
          kind: 'warning',
        });
        resolve(true);
        return;
      }

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

        // TODO: source whitelistedForOTP from real API once available.
        const whitelistedForOTP = (electiveRecord as any)?.whitelistedForOTP ?? false;

        let settled = false;
        const dispose = showModal('otp-verification-modal', {
          onClose: () => {
            dispose();
          },
          phoneNumber,
          otpLength: 6,
          expiryMinutes: 5,
          centerBoxes: true,

          onRequestOtp: async (_phone: string) => {
            const res = await sendSHAOtp(electedCRId, codes);
            if (!res.success) {
              throw new Error(extractUpstreamError(res as any, t('otpRequestFailed', 'Failed to send OTP')));
            }
          },
          onVerify: async (enteredOtp: string) => {
            const isInpatient = serviceTypeRef.current === 'INPATIENT';
            const claimResponse = await createSHAVirtualClaim(
              patientCRIdRef.current!,
              enteredOtp,
              serviceTypeRef.current,
              interventionCodesRef.current,
              '',
              patientUuid,
              isInpatient
                ? {
                    admission_date: admissionDateRef.current ? toSavannahISO(admissionDateRef.current) : undefined,
                    estimated_days_of_admission: estimatedDaysRef.current ?? undefined,
                  }
                : undefined,
              undefined,
            );
            if (!claimResponse.success) {
              throw new Error(
                extractUpstreamError(claimResponse as any, t('virtualClaimFailed', 'SHA virtual claim failed.')),
              );
            }
            verifiedOtpRef.current = enteredOtp;
            shaClaimResponseRef.current = claimResponse;
          },
          onVerificationSuccess: () => {
            settled = true;
            dispose();
            resolve(true);
          },
          onCleanup: () => {
            if (!settled) {
              resolve(false);
            }
          },

          authMode: 'multi',
          whitelistedForOTP,

          onStartBiometric: buildBiometricStarter(electedCRId, codes, undefined),
          onBiometricSuccess: (result: { authorization_code: string; consent_token: string }) => {
            shaClaimResponseRef.current = {
              success: true,
              authorization_code: result.authorization_code,
              consent_token: result.consent_token,
            } as VirtualClaimResponse;
            settled = true;
            dispose();
            resolve(true);
          },
          onBiometricCancel: (_consentToken: string | null) => {
            // TODO: call /biometric-cancel endpoint when implemented
          },
          onRequestWhitelist: () => {
            handleRequestWhitelist();
            settled = true;
            dispose();
            resolve(false);
          },
          onRejected: () => {
            handleReject();
            settled = true;
            dispose();
            resolve(true);
          },
        });
        return;
      }

      const codes = selectedInterventions.length > 0 ? selectedInterventions : [''];
      patientCRIdRef.current = patientCRId;
      interventionCodesRef.current = codes;
      const paymentMechanism = resolvePaymentMechanism(codes);

      // TODO: source whitelistedForOTP from patient API or eligibility check.
      const whitelistedForOTP = (patient as any)?.whitelistedForOTP ?? false;

      let settled = false;
      const dispose = showModal('otp-verification-modal', {
        onClose: () => {
          dispose();
        },
        phoneNumber,
        otpLength: 6,
        expiryMinutes: 5,
        centerBoxes: true,

        onRequestOtp: async (_phone: string) => {
          const res = await sendSHAOtp(patientCRId, codes);
          if (!res.success) {
            throw new Error(extractUpstreamError(res as any, t('otpRequestFailed', 'Failed to send OTP')));
          }
        },
        onVerify: async (enteredOtp: string) => {
          const isInpatient = serviceTypeRef.current === 'INPATIENT';
          const claimResponse = await createSHAVirtualClaim(
            patientCRIdRef.current!,
            enteredOtp,
            serviceTypeRef.current,
            interventionCodesRef.current,
            '',
            patientUuid,
            isInpatient
              ? {
                  admission_date: admissionDateRef.current ? toSavannahISO(admissionDateRef.current) : undefined,
                  estimated_days_of_admission: estimatedDaysRef.current ?? undefined,
                }
              : undefined,
            paymentMechanism,
          );
          if (!claimResponse.success) {
            throw new Error(
              extractUpstreamError(claimResponse as any, t('virtualClaimFailed', 'SHA virtual claim failed.')),
            );
          }
          verifiedOtpRef.current = enteredOtp;
          shaClaimResponseRef.current = claimResponse;
        },
        onVerificationSuccess: () => {
          settled = true;
          dispose();
          resolve(true);
        },
        onCleanup: () => {
          if (!settled) {
            resolve(false);
          }
        },

        authMode: 'multi',
        whitelistedForOTP,

        onStartBiometric: buildBiometricStarter(patientCRId, codes, paymentMechanism),
        onBiometricSuccess: (result: { authorization_code: string; consent_token: string }) => {
          shaClaimResponseRef.current = {
            success: true,
            authorization_code: result.authorization_code,
            consent_token: result.consent_token,
          } as VirtualClaimResponse;
          settled = true;
          dispose();
          resolve(true);
        },
        onBiometricCancel: (_consentToken: string | null) => {
          // TODO: call /biometric-cancel endpoint when implemented
        },
        onRequestWhitelist: () => {
          handleRequestWhitelist();
          settled = true;
          dispose();
          resolve(false);
        },
        onRejected: () => {
          handleReject();
          settled = true;
          dispose();
          resolve(true);
        },
      });
    });
  }, [
    hieFeatureFlags,
    isInsuranceSchemeSha,
    patient,
    phoneNumber,
    selectedInterventions,
    isElectiveVisit,
    electiveRecord,
    isApproved,
    crIdentificationNumberUUID,
    patientUuid,
    resolvePaymentMechanism,
    buildBiometricStarter,
    handleRequestWhitelist,
    handleReject,
    t,
  ]);

  useEffect(() => {
    const onVisitCreatedOrUpdated = async (visit: Visit) => {
      if (visitStatus === 'past') {
        return visit;
      }

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

        if (hieFeatureFlags && isInsuranceSchemeSha && shaClaimResponseRef.current) {
          const claimResponse = shaClaimResponseRef.current;
          const authCode = claimResponse.authorization_code ?? claimResponse.claim?.authorization_code;

          if (authCode && visit?.uuid) {
            try {
              await linkVisitToClaim(authCode, visit.uuid, patientUuid);
            } catch (err) {
              throw new Error(`Failed to link visit to claim: ${err instanceof Error ? err.message : String(err)}`);
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
        verifiedOtpRef.current = null;
        patientCRIdRef.current = null;
        interventionCodesRef.current = [];
        serviceTypeRef.current = 'OUTPATIENT';
        admissionDateRef.current = null;
        estimatedDaysRef.current = null;
        shaClaimResponseRef.current = null;
      }
    };

    setVisitFormCallbacks({
      onVisitCreatedOrUpdated,
      onBeforeVisitSave: launchSHAOtpFlow,
      isSHAVisit: !!(hieFeatureFlags && isInsuranceSchemeSha),
      isElectiveNotApproved,
    });
  }, [
    attributes,
    selectedBillingServices,
    createBillPayload,
    handleCreateBill,
    hieFeatureFlags,
    isInsuranceSchemeSha,
    isElectiveVisit,
    launchSHAOtpFlow,
    patientUuid,
    setVisitFormCallbacks,
    t,
    isElectiveNotApproved,
    visitStatus,
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
      {hieFeatureFlags && <SHANumberValidity paymentMethod={attributes} patientUuid={patientUuid} />}

      {hieFeatureFlags && isInsuranceSchemeSha && (
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
                    {electiveRecord.tariff && (
                      <div className={styles.electiveInterventionRow}>
                        <span className={styles.electiveInterventionLabel}>{t('tariff', 'Tariff')}</span>
                        <span className={styles.electiveInterventionValue}>
                          {formatCurrency(Number(electiveRecord.tariff))}
                        </span>
                      </div>
                    )}
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

      {hieFeatureFlags && isInsuranceSchemeSha && isElectiveVisit === 'no' && (
        <SHABenefitPackagesAndInterventions
          patientUuid={patientUuid}
          visitTypeUuid={visitTypeUuid}
          onInterventionsCached={(cache) => {
            interventionCacheRef.current = { ...interventionCacheRef.current, ...cache };
          }}
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
