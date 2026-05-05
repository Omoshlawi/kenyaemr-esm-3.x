import {
  Button,
  ButtonSet,
  Form,
  InlineLoading,
  InlineNotification,
  Layer,
  MultiSelect,
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
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import React, { useState, useCallback } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import styles from './elective-auth.scss';
import {
  createElectiveAuthorization,
  sendSHAOtp,
  usePatientPhone,
  useSHAInterventions,
  useSHASubBenefits,
} from '../../../../../billing-form/social-health-authority/sha-virtual-claim.resource';
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

  const { crIdentificationNumberUUID } = useConfig<BillingConfig>();

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
      subBenefitCodes: [],
      interventionCodes: [],
      serviceType: 'OUTPATIENT',
    },
  });

  const patientUuid = watch('patientUuid');
  const subBenefitCodes = watch('subBenefitCodes');
  const interventionCodes = watch('interventionCodes');

  const { patient } = usePatient(patientUuid ?? '');
  const crId: string | null =
    patient?.identifiers?.find((id) => id.identifierType?.uuid === crIdentificationNumberUUID)?.identifier ?? null;

  const patientPhone = usePatientPhone(patientUuid ?? '');

  const { subBenefits, isLoading: loadingSubBenefits } = useSHASubBenefits(crId ?? '');

  const { interventions, isLoading: loadingInterventions } = useSHAInterventions(crId ?? '', subBenefitCodes[0] ?? '');

  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorizeError, setAuthorizeError] = useState('');

  const handleAuthorize = useCallback(
    (data: ElectivePreAuthFormData) => {
      if (!crId) {
        setAuthorizeError(t('selectPatientWithCR', 'Please select a patient with a SHA CR ID'));
        return;
      }
      setAuthorizeError('');
      setIsAuthorizing(true);

      let otpVerified = false;

      const firstInterventionCode = data.interventionCodes[0];
      const firstIntervention = interventions.find((i) => i.code === firstInterventionCode);
      const firstInterventionName = firstIntervention?.name ?? '';
      const firstInterventionTariff = (firstIntervention as any)?.tariff ?? '';

      const dispose = showModal('otp-verification-modal', {
        onClose: () => {
          if (!otpVerified) {
            setIsAuthorizing(false);
          }
          dispose();
        },
        phoneNumber: patientPhone || '',
        otpLength: 6,
        expiryMinutes: 5,
        centerBoxes: true,

        onRequestOtp: async (_phone: string) => {
          const res = await sendSHAOtp(crId, data.interventionCodes);
          if (!res.success) {
            throw new Error(extractUpstreamError(res, t('otpFailed', 'Failed to send OTP')));
          }
        },

        onVerify: async (enteredOtp: string) => {
          const res = await createElectiveAuthorization(
            crId,
            enteredOtp,
            firstInterventionCode,
            data.patientUuid,
            data.serviceType,
            firstInterventionName,
            firstInterventionTariff,
          );
          if (!res.success) {
            throw new Error(extractUpstreamError(res, t('authorizeFailed', 'Authorization failed')));
          }
          otpVerified = true;
        },

        onVerificationSuccess: () => {
          dispose();
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
        },

        onCleanup: () => {
          if (!otpVerified) {
            setIsAuthorizing(false);
          }
        },
      });
    },
    [crId, patientPhone, interventions, mutate, closeWorkspace, t],
  );

  return (
    <Workspace2 title={workspaceTitle} hasUnsavedChanges={hasUnsavedChanges}>
      <Form className={styles.form} onSubmit={handleSubmit(handleAuthorize)}>
        <div className={styles.formBody}>
          <Stack gap={5}>
            <p className={styles.helperText}>
              {t(
                'electiveFormHelper',
                'Search for a patient, select an elective intervention, then send an OTP to authorize. The elective preauth will appear in the Scheduled tab where you can submit it to SHA.',
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
                          setValue('subBenefitCodes', []);
                          setValue('interventionCodes', []);
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
                          setValue('subBenefitCodes', []);
                          setValue('interventionCodes', []);
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
                    name="subBenefitCodes"
                    render={({ field }) => (
                      <>
                        <MultiSelect
                          id="elective-sub-benefit-multiselect"
                          titleText={t('benefitPackage', 'Benefit package')}
                          label={t('selectBenefitPackages', 'Select benefit packages')}
                          items={subBenefits}
                          itemToString={(b) => (b ? `${b.code} — ${b.name}` : '')}
                          selectedItems={subBenefits.filter((b) => field.value.includes(b.code))}
                          onChange={({ selectedItems }) => {
                            const codes = (selectedItems ?? []).map((b) => b.code);
                            field.onChange(codes);
                            setValue('interventionCodes', []);
                          }}
                          selectionFeedback="top-after-reopen"
                          invalid={!!errors.subBenefitCodes}
                          invalidText={errors.subBenefitCodes?.message}
                        />
                        {field.value.length > 0 && (
                          <div className={styles.tagsContainer}>
                            {field.value.map((code) => {
                              const benefit = subBenefits.find((b) => b.code === code);
                              return (
                                <Tag key={code} type="blue" size="lg" className={styles.tag}>
                                  {benefit?.name ?? code}
                                </Tag>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  />
                )}
              </Layer>
            )}

            {subBenefitCodes.length > 0 && (
              <Layer>
                {loadingInterventions ? (
                  <InlineLoading status="active" description={t('loadingInterventions', 'Loading interventions...')} />
                ) : (
                  <Controller
                    control={control}
                    name="interventionCodes"
                    render={({ field }) => {
                      type InterventionItem = {
                        id: string;
                        code: string;
                        text: string;
                        disabled: boolean;
                        isElective: boolean;
                        name: string;
                      };

                      const items: InterventionItem[] = interventions
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
                        .sort((a, b) => Number(b.isElective) - Number(a.isElective));

                      const electiveCount = items.filter((i) => i.isElective).length;
                      const selectedItemObjects = items.filter((i) => (field.value ?? []).includes(i.code));

                      return (
                        <>
                          <MultiSelect
                            ref={field.ref}
                            id="elective-form-interventions"
                            titleText={t('interventions', 'Interventions')}
                            label={t('chooseInterventions', 'Choose interventions')}
                            items={items}
                            itemToString={(i) => (i ? i.text : '')}
                            selectedItems={selectedItemObjects}
                            helperText={
                              electiveCount > 0
                                ? t(
                                    'nonElectiveDisabledHint',
                                    'Only elective interventions can be selected here. Use a normal visit for others.',
                                  )
                                : undefined
                            }
                            onChange={({ selectedItems }) => {
                              const codes = (selectedItems ?? [])
                                .filter((i): i is InterventionItem => i !== null && !i.disabled)
                                .map((i) => i.code);
                              field.onChange(codes);
                            }}
                            selectionFeedback="top-after-reopen"
                            invalid={!!errors.interventionCodes}
                            invalidText={errors.interventionCodes?.message}
                          />
                          {(field.value ?? []).length > 0 && (
                            <div className={styles.tagsContainer}>
                              {(field.value ?? []).map((code) => {
                                const intervention = interventions.find((i) => i.code === code);
                                const name = intervention?.name ?? code;
                                const tariff = (intervention as any)?.tariff
                                  ? ` - ${formatCurrency(Number((intervention as any).tariff))}`
                                  : '';
                                return (
                                  <Tag key={code} type="cyan" size="lg" className={styles.tag}>
                                    {name}
                                    {tariff}: {t('electivePreauthRequired', 'Elective preauth required')}
                                  </Tag>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    }}
                  />
                )}
              </Layer>
            )}

            {interventionCodes.length > 0 && (
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
            disabled={isAuthorizing || !crId || interventionCodes.length === 0}>
            {isAuthorizing ? (
              <InlineLoading description={t('sendingOtp', 'Sending OTP...')} />
            ) : (
              t('sendOtpAndAuthorize', 'Send OTP & Authorize')
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default ElectivePreAuthForm;
