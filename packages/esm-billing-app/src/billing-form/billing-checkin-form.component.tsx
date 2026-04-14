import { FilterableMultiSelect, InlineLoading, InlineNotification } from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { showModal, showSnackbar, useConfig, useFeatureFlag, usePatient, type Visit } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
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
  createSHAVirtualClaim,
  getPatientCRNumber,
  sendSHAOtp,
  usePatientPhone,
} from './social-health-authority/sha-virtual-claim.resource';
import { toSavannahISO } from './social-health-authority/helper';

export interface VisitFormCallbacks {
  onVisitCreatedOrUpdated: (visit: Visit) => Promise<any>;
  onBeforeVisitSave?: () => Promise<boolean>;
  isSHAVisit?: boolean;
}

type BillingCheckInFormProps = {
  patientUuid: string;
  setVisitFormCallbacks: (callbacks: VisitFormCallbacks) => void;
  visitFormOpenedFrom?: string;
  visitTypeUuid?: string;
};

type BillingCheckInFormValue = VisitAttributesFormValue & {
  admissionDate: Date | null;
  estimatedDaysOfAdmission: number;
};

const BillingCheckInForm: React.FC<BillingCheckInFormProps> = ({
  patientUuid,
  setVisitFormCallbacks,
  visitTypeUuid,
}) => {
  const { t } = useTranslation();
  const hieFeatureFlags = useFeatureFlag('healthInformationExchange');
  const {
    visitAttributeTypes: { isPatientExempted },
    inPatientVisitTypeUuid,
    shaIdentificationNumberUUID,
  } = useConfig<BillingConfig>();

  const { patient } = usePatient(patientUuid);
  const phoneNumber = usePatientPhone(patientUuid);
  const { cashPoints, isLoading: isLoadingCashPoints, error: cashError } = useCashPoint();
  const { lineItems, isLoading: isLoadingLineItems, error: lineError } = useBillableItems();

  const [attributes, setAttributes] = useState<Array<{ attributeType: string; value: string }>>([]);
  const [selectedBillingServices, setSelectedBillingServices] = useState<Array<any>>([]);

  const verifiedOtpRef = useRef<string | null>(null);
  const patientCRIdRef = useRef<string | null>(null);
  const interventionCodesRef = useRef<string[]>([]);
  const serviceTypeRef = useRef<string>('OUTPATIENT');
  const admissionDateRef = useRef<Date | null>(null);
  const estimatedDaysRef = useRef<number | null>(null);

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

  /**
   * Launched BEFORE the visit saves when SHA is selected.
   * Opens OTP modal → user sends OTP → enters code → stores verified OTP.
   * Returns true to proceed with visit save, false if user cancels.
   */
  const launchSHAOtpFlow = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!hieFeatureFlags || !isInsuranceSchemeSha) {
        resolve(true);
        return;
      }

      const patientCRId = getPatientCRNumber(patient as fhir.Patient, shaIdentificationNumberUUID);

      if (!patientCRId) {
        showSnackbar({
          title: t('shaVirtualClaim', 'SHA Virtual Claim'),
          subtitle: t('noCRNumber', 'Patient has no SHA CR number. Proceeding without virtual claim.'),
          kind: 'warning',
        });
        resolve(true);
        return;
      }

      const codes = selectedInterventions.length > 0 ? selectedInterventions : ['SHA-18-002'];
      patientCRIdRef.current = patientCRId;
      interventionCodesRef.current = codes;

      let otpVerified = false;

      const dispose = showModal('otp-verification-modal', {
        onClose: () => {
          if (!otpVerified) {
            resolve(false);
          }
          dispose();
        },
        phoneNumber,
        otpLength: 6,
        expiryMinutes: 5,
        centerBoxes: true,

        onRequestOtp: async (_phone: string) => {
          const response = await sendSHAOtp(patientCRId, codes);
          if (!response.success) {
            throw new Error(response.error ?? t('otpRequestFailed', 'Failed to send OTP'));
          }
        },

        onVerify: async (enteredOtp: string) => {
          verifiedOtpRef.current = enteredOtp;
          otpVerified = true;
        },

        onVerificationSuccess: () => {
          dispose();
          resolve(true);
        },

        onCleanup: () => {
          if (!otpVerified) {
            resolve(false);
          }
        },
      });
    });
  }, [hieFeatureFlags, isInsuranceSchemeSha, patient, phoneNumber, selectedInterventions, t]);

  useEffect(() => {
    const onVisitCreatedOrUpdated = async (visit: Visit) => {
      if (attributes.length > 0) {
        try {
          await Promise.all(attributes.map((attr) => createVisitAttribute(visit.uuid, attr.attributeType, attr.value)));
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

      if (hieFeatureFlags && isInsuranceSchemeSha && verifiedOtpRef.current && patientCRIdRef.current) {
        try {
          const isInpatient = serviceTypeRef.current === 'INPATIENT';

          const claimResponse = await createSHAVirtualClaim(
            patientCRIdRef.current,
            verifiedOtpRef.current,
            serviceTypeRef.current,
            interventionCodesRef.current,
            visit.uuid,
            patientUuid,
            isInpatient
              ? {
                  admission_date: admissionDateRef.current ? toSavannahISO(admissionDateRef.current) : undefined,
                  estimated_days_of_admission: estimatedDaysRef.current ?? undefined,
                }
              : undefined,
          );

          if (claimResponse.success) {
            const needsPreauth = claimResponse.claim?.interventions?.some((i: any) => i.needs_preauth);
            showSnackbar({
              title: t('shaVirtualClaim', 'SHA Virtual Claim'),
              subtitle: needsPreauth
                ? t(
                    'virtualClaimCreatedPreauthRequired',
                    'Virtual claim created. Preauth required — check the preauth queue.',
                  )
                : t('virtualClaimCreated', 'Virtual claim created successfully.'),
              kind: 'success',
            });
          } else {
            showSnackbar({
              title: t('shaVirtualClaimError', 'SHA Virtual Claim Error'),
              subtitle: claimResponse.error ?? t('virtualClaimFailed', 'Failed to create virtual claim'),
              kind: 'warning',
            });
          }
        } catch (err) {
          showSnackbar({
            title: t('shaVirtualClaimError', 'SHA Virtual Claim Error'),
            subtitle: (err as Error)?.message,
            kind: 'error',
          });
        } finally {
          verifiedOtpRef.current = null;
          patientCRIdRef.current = null;
          interventionCodesRef.current = [];
          serviceTypeRef.current = 'OUTPATIENT';
          admissionDateRef.current = null;
          estimatedDaysRef.current = null;
        }
      }

      return visit;
    };

    setVisitFormCallbacks({
      onVisitCreatedOrUpdated,
      onBeforeVisitSave: launchSHAOtpFlow,
      isSHAVisit: !!(hieFeatureFlags && isInsuranceSchemeSha),
    });
  }, [
    attributes,
    selectedBillingServices,
    createBillPayload,
    handleCreateBill,
    hieFeatureFlags,
    isInsuranceSchemeSha,
    launchSHAOtpFlow,
    patientUuid,
    setVisitFormCallbacks,
    t,
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

  return (
    <FormProvider {...formMethods}>
      <VisitAttributesForm setAttributes={setAttributes} />
      {hieFeatureFlags && <SHANumberValidity paymentMethod={attributes} patientUuid={patientUuid} />}
      {hieFeatureFlags && isInsuranceSchemeSha && (
        <SHABenefitPackagesAndInterventions patientUuid={patientUuid} visitTypeUuid={visitTypeUuid} />
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
