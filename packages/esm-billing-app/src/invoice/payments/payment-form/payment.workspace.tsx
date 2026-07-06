import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveWrapper,
  restBaseUrl,
  showModal,
  showSnackbar,
  useConfig,
  useLayoutType,
  useVisit,
  Workspace2,
  Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import {
  Button,
  ButtonSet,
  ComboBox,
  InlineLoading,
  InlineNotification,
  NumberInput,
  Tag,
  TextInput,
} from '@carbon/react';
import { Add, TrashCan } from '@carbon/react/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import startCase from 'lodash-es/startCase';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import { z } from 'zod';
import { TFunction } from 'i18next';

import { usePaymentModes } from '../../../billing.resource';
import { useCurrencyFormatting } from '../../../helpers/currency';
import { PaymentStatus, type LineItem, type MappedBill } from '../../../types';
import { extractErrorMessagesFromResponse } from '../../../utils';
import { makePayment } from '../payments.resource';
import { dispatchClaimLinesToSha } from '../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import PomsfSchemeBalancePicker from '../../../billing-form/social-health-authority/pomsf-scheme-balance-picker.component';

import styles from './payment.workspace.scss';
import { getPatientUuidFromUrl } from '../../../prompt-payment/prompt-payment-modal.component';
import { BillingConfig } from '../../../config-schema';
import {
  useClaimForVisit,
  useVisitAttribute,
} from '../../../bill-administration/patient-billing/workspaces/create-bill/create-bill.resource';
import { shaDispatchFailed, tariffPreauthDeltaThreshold } from './constant';

type PaymentWorkspaceProps = {
  selectedLineItems: Array<LineItem>;
  bill: MappedBill;
};

type PaymentModeOption = NonNullable<ReturnType<typeof usePaymentModes>['paymentModes']>[number] & {
  attributeTypes?: Array<{
    uuid: string;
    name?: string;
    required?: boolean;
  }>;
};

type PaymentLine = {
  paymentMode?: PaymentModeOption;
  amount?: number;
  referenceCode?: string;
  interventionCode?: string;
};

type PaymentModeFormData = {
  payments: Array<PaymentLine>;
};

type InterventionItem = {
  id: string;
  code: string;
  subBenefitCode: string | null;
  name: string;
  text: string;
  paymentMechanism: string | null;
  isPerDiem: boolean;
  tariff: number | null;
  preauthEstimatedAmount: number | null;
  preauthApproved: boolean;
  effectiveAmount: number | null;
  accruedAmount: number | null;
  accruedDays: number | null;
  needsPreauth: boolean;
  preauthExists: boolean;
  disabled: boolean;
  alreadySent: boolean;
};

const paymentLineSchema = (t: TFunction, insurancePaymentModeUuid: string, requireIntervention: boolean) =>
  z
    .object({
      paymentMode: z
        .object({
          uuid: z.string(),
          name: z.string(),
          attributeTypes: z
            .array(
              z
                .object({
                  uuid: z.string(),
                  name: z.string().optional(),
                  required: z.boolean().optional(),
                })
                .passthrough(),
            )
            .optional(),
        })
        .optional(),
      amount: z.number().optional(),
      referenceCode: z.string().optional(),
      interventionCode: z.string().optional(),
    })
    .superRefine((line, ctx) => {
      if (!line.paymentMode?.uuid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paymentMode'],
          message: t('paymentModeRequired', 'Payment mode is required'),
        });
      }

      if (line.amount == null || line.amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message: t('enterValidAmount', 'Enter an amount greater than zero'),
        });
      }

      const requiresReferenceCode = line.paymentMode?.attributeTypes?.some((attr) => attr.required) ?? false;
      if (requiresReferenceCode && !line.referenceCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['referenceCode'],
          message: t('referenceCodeRequiredForThisPaymentMode', 'Reference code is required for this payment mode'),
        });
      }

      const isInsurance = line.paymentMode?.uuid === insurancePaymentModeUuid;
      if (requireIntervention && isInsurance && !line.interventionCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['interventionCode'],
          message: t('selectShaIntervention', 'Select the SHA intervention this payment is recorded against'),
        });
      }
    });

const paymentFormSchema = (
  totalAmount: number,
  t: TFunction,
  insurancePaymentModeUuid: string,
  requireIntervention: boolean,
) =>
  z
    .object({
      payments: z
        .array(paymentLineSchema(t, insurancePaymentModeUuid, requireIntervention))
        .min(1, t('atLeastOnePayment', 'Add at least one payment')),
    })
    .superRefine((data, ctx) => {
      const totalTendered = data.payments.reduce((acc, line) => acc + (Number(line.amount) || 0), 0);
      if (Math.round(totalTendered * 100) !== Math.round(totalAmount * 100)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payments'],
          message: t('paymentsMustSumToTotal', 'The payments must add up to the total amount due'),
        });
      }
    });

const PaymentWorkspace: React.FC<Workspace2DefinitionProps<PaymentWorkspaceProps, {}, {}>> = ({
  workspaceProps: { selectedLineItems, bill },
  closeWorkspace,
}) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [shaError, setShaError] = useState<string | null>(null);
  const isTablet = useLayoutType() === 'tablet';

  const unPaidLineItems = selectedLineItems.filter((item) => item.paymentStatus !== PaymentStatus.PAID);
  const totalAmount = unPaidLineItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const billLineItemsUuids = unPaidLineItems.map((item) => item.uuid);
  const {
    visitAttributeTypes: { insuranceScheme },
    insurancePaymentMethod,
  } = useConfig<BillingConfig>();

  const { paymentModes, isLoading: isLoadingPaymentModes } = usePaymentModes();
  const patientUuid = getPatientUuidFromUrl();

  const { activeVisit } = useVisit(patientUuid);
  const visitUuid = activeVisit?.uuid;

  const { isSHA: isSHAVisit } = useVisitAttribute(visitUuid ?? '', insuranceScheme);
  const claimForVisit = useClaimForVisit(visitUuid ?? '');

  const sentInterventionCodes = useMemo(() => {
    const sentLines = ((claimForVisit as any)?.sent_line_items ?? []) as Array<any>;
    const unPaidUuids = new Set(unPaidLineItems.map((item) => item.uuid));
    const codes = new Set<string>();
    for (const sl of sentLines) {
      if (sl?.voided) {
        continue;
      }
      if (!sl?.intervention_code) {
        continue;
      }
      const lineUuid = sl?.openmrs_line_item_uuid ? String(sl.openmrs_line_item_uuid) : null;
      if (lineUuid && unPaidUuids.has(lineUuid)) {
        codes.add(sl.intervention_code);
      }
    }
    return codes;
  }, [claimForVisit, unPaidLineItems]);

  const interventionItems: Array<InterventionItem> = useMemo(() => {
    const interventions = ((claimForVisit as any)?.interventions ?? []) as Array<any>;
    return interventions
      .filter((iv) => (iv?.status ?? '').toUpperCase() === 'ACTIVE')
      .map((iv: any) => {
        const mech = (iv?.payment_mechanism ?? '').toString().toUpperCase();
        const isPerDiem = mech.includes('DIEM');

        const catalogTariff: number | null = iv?.keph_level_tariff ?? null;
        const preauthEstimatedAmount: number | null = iv?.preauth_estimated_amount ?? null;
        const preauthApproved: boolean = iv?.preauth_approved === true;
        const accruedAmount: number | null = iv?.accrued_amount ?? null;
        const accruedDays: number | null = iv?.accrued_days ?? null;
        const effectiveAmount: number | null = isPerDiem
          ? accruedAmount
          : preauthApproved && preauthEstimatedAmount != null
          ? preauthEstimatedAmount
          : catalogTariff;

        const name = iv.intervention_name ?? t('unnamedIntervention', 'Unnamed intervention');
        const alreadySent = sentInterventionCodes.has(iv.intervention_code);

        const mechLabel = isPerDiem
          ? t('perDiem', 'Per diem')
          : mech === 'CAPITATION'
          ? t('capitation', 'Capitation')
          : mech || t('feeForService', 'Fee-for-service');
        let displayAmount: string;
        if (isPerDiem) {
          if (accruedAmount != null && accruedDays != null) {
            displayAmount = `${formatCurrency(accruedAmount)} (${accruedDays} ${
              accruedDays === 1 ? t('day', 'day') : t('days', 'days')
            })`;
          } else if (catalogTariff != null) {
            displayAmount = `${formatCurrency(catalogTariff)}/${t('day', 'day')}`;
          } else {
            displayAmount = '—';
          }
        } else if (preauthApproved && preauthEstimatedAmount != null) {
          if (catalogTariff != null && Math.abs(catalogTariff - preauthEstimatedAmount) > tariffPreauthDeltaThreshold) {
            displayAmount = `${formatCurrency(preauthEstimatedAmount)} (${t('preauthApproved', 'preauth')}, ${t(
              'catalogShort',
              'catalog',
            )} ${formatCurrency(catalogTariff)})`;
          } else {
            displayAmount = formatCurrency(preauthEstimatedAmount);
          }
        } else {
          displayAmount = catalogTariff != null ? formatCurrency(catalogTariff) : '—';
        }

        const sentSuffix = alreadySent ? ` — ${t('alreadySentForBill', 'Already sent for this bill')}` : '';

        return {
          id: `intervention-${iv.intervention_code}`,
          code: iv.intervention_code,
          subBenefitCode: iv.sub_benefit_code ?? null,
          name,
          text: `${iv.intervention_code} · ${name} · ${mechLabel} — ${displayAmount}${sentSuffix}`,
          paymentMechanism: mech || null,
          isPerDiem,
          tariff: catalogTariff,
          preauthEstimatedAmount,
          preauthApproved,
          effectiveAmount,
          accruedAmount,
          accruedDays: accruedDays != null ? Math.round(accruedDays) : null,
          needsPreauth: Boolean(iv?.needs_preauth),
          preauthExists: Boolean(iv?.preauth_exist),
          disabled: alreadySent,
          alreadySent,
        };
      });
  }, [claimForVisit, sentInterventionCodes, formatCurrency, t]);

  const authorizationCode = claimForVisit.authorizationCode ?? null;
  const requiresShaIntervention = isSHAVisit && interventionItems.length > 0;

  const resolverSchema = useMemo(
    () => paymentFormSchema(totalAmount, t, insurancePaymentMethod, requiresShaIntervention),
    [totalAmount, t, insurancePaymentMethod, requiresShaIntervention],
  );

  const formMethods = useForm<PaymentModeFormData>({
    resolver: zodResolver(resolverSchema),
    mode: 'onTouched',
    defaultValues: {
      payments: [{ paymentMode: undefined, amount: undefined, referenceCode: undefined, interventionCode: undefined }],
    },
  });

  const {
    control,
    trigger,
    formState: { isSubmitting, errors, isValid, isDirty },
  } = formMethods;

  const prevRequiresShaIntervention = useRef(requiresShaIntervention);
  useEffect(() => {
    if (prevRequiresShaIntervention.current === requiresShaIntervention) {
      return;
    }
    prevRequiresShaIntervention.current = requiresShaIntervention;
    if (isDirty) {
      trigger().catch(() => {});
    }
  }, [requiresShaIntervention, isDirty, trigger]);

  const { fields, append, remove } = useFieldArray({ control, name: 'payments' });

  const watchedPayments = useWatch({ control, name: 'payments' });
  const totalTendered = (watchedPayments ?? []).reduce((acc, line) => acc + (Number(line?.amount) || 0), 0);
  const remainingCents = Math.round(totalAmount * 100) - Math.round(totalTendered * 100);
  const remaining = remainingCents / 100;
  const isFullyAllocated = remainingCents === 0;

  const overAmountLineIndices = useMemo(() => {
    const result = new Set<number>();
    (watchedPayments ?? []).forEach((line, idx) => {
      if (!line) {
        return;
      }
      if (line.paymentMode?.uuid !== insurancePaymentMethod) {
        return;
      }
      if (!line.interventionCode) {
        return;
      }
      if (line.amount == null) {
        return;
      }
      const intervention = interventionItems.find((iv) => iv.code === line.interventionCode);
      if (!intervention) {
        return;
      }

      let cap: number | null = null;
      if (intervention.isPerDiem) {
        cap = intervention.accruedAmount;
      } else if (intervention.preauthApproved) {
        cap = intervention.preauthEstimatedAmount;
      }
      if (cap == null) {
        return;
      }

      if ((line.amount as number) > cap) {
        result.add(idx);
      }
    });
    return result;
  }, [watchedPayments, interventionItems, insurancePaymentMethod]);

  const hasOverAmount = overAmountLineIndices.size > 0;

  useEffect(() => {
    if (isDirty) {
      setHasUnsavedChanges(isDirty);
    }
  }, [isDirty, setHasUnsavedChanges]);

  useEffect(() => {
    if (shaError) {
      setShaError(null);
    }
  }, [watchedPayments]);

  const handlePrintReceipt = (paymentsUuids: Array<string>) => {
    const lineItemUuids = unPaidLineItems.map((item: any) => item.uuid);
    const receiptUrl = `${window.openmrsBase}${restBaseUrl}/cashier/receipt?billId=${
      bill.id
    }&lineItemUuids=${lineItemUuids.join(',')}&paymentsUuids=${paymentsUuids.join(',')}`;
    const dispose = showModal('print-preview-modal', {
      onClose: () => dispose(),
      title: `${t('receipt', 'Receipt')} ${bill?.receiptNumber} - ${startCase(bill?.patientName)}`,
      documentUrl: receiptUrl,
    });
  };

  const onSubmit = async (data: PaymentModeFormData) => {
    const createdUuids: Array<string> = [];
    let failedAtIndex: number | null = null;
    let failureError: unknown = null;

    for (let i = 0; i < data.payments.length; i++) {
      const line = data.payments[i];
      const isShaInsurance = isSHAVisit && line.paymentMode?.uuid === insurancePaymentMethod && line.interventionCode;

      if (isShaInsurance && line.interventionCode) {
        const intervention = interventionItems.find((iv) => iv.code === line.interventionCode);
        if (!intervention) {
          showSnackbar({
            title: t('interventionLookupFailed', 'Intervention lookup failed'),
            kind: 'error',
            subtitle: t(
              'interventionNotFound',
              'Could not resolve intervention {{code}} on this claim. Try reopening the workspace.',
              { code: line.interventionCode },
            ),
            isLowContrast: true,
          });
          failedAtIndex = i;
          failureError = { [shaDispatchFailed]: true };
          break;
        }

        const shaPortionLine = {
          uuid: unPaidLineItems[0]?.uuid ?? '',
          price: line.amount!,
          quantity: 1,
        };

        const dispatch = await dispatchClaimLinesToSha(
          authorizationCode ?? '',
          {
            code: intervention.code,
            isPerDiem: intervention.isPerDiem,
            paymentMechanism: intervention.paymentMechanism,
          },
          [shaPortionLine],
          t,
        );
        if (!dispatch.ok) {
          showSnackbar({
            title: t('shaRejectedLines', 'SHA rejected the bill lines'),
            kind: 'error',
            subtitle: dispatch.error,
            isLowContrast: true,
          });
          setShaError(dispatch.error ?? t('shaFailed', 'Failed to add claim lines'));
          failedAtIndex = i;
          failureError = { [shaDispatchFailed]: true };
          break;
        }
      }

      const paymentPayload = {
        instanceType: line.paymentMode!.uuid,
        amount: line.amount,
        amountTendered: line.amount,
        attributes:
          line.referenceCode && line.paymentMode?.attributeTypes?.length
            ? [{ attributeType: line.paymentMode.attributeTypes[0].uuid, value: line.referenceCode }]
            : [],
        lineItemsToMarkPaid: billLineItemsUuids,
      };

      try {
        const response = await makePayment(bill.uuid, paymentPayload);
        if (!response.ok || !response.data?.uuid) {
          throw response;
        }
        createdUuids.push(response.data.uuid);
      } catch (err) {
        failedAtIndex = i;
        failureError = err;
        break;
      }
    }
    const cacheUrl = `${restBaseUrl}/cashier/bill/${bill.uuid}`;
    mutate((key) => typeof key === 'string' && key.startsWith(cacheUrl), undefined, { revalidate: true });
    mutate((key) => typeof key === 'string' && key.includes('virtualclaims/claim-for-visit'), undefined, {
      revalidate: true,
    });

    if (failedAtIndex === null) {
      showSnackbar({
        title: t('paymentSaved', 'Payment saved'),
        kind: 'success',
        subtitle: t('paymentSavedSuccessfully', 'Payment saved successfully'),
      });
      handlePrintReceipt(createdUuids);
      closeWorkspace({ discardUnsavedChanges: true });
      return;
    }

    const shaSnackbarAlreadyShown = Boolean((failureError as Record<string, unknown> | null)?.[shaDispatchFailed]);

    const errorDetail = extractErrorMessagesFromResponse((failureError as { responseBody?: unknown })?.responseBody);

    if (createdUuids.length === 0) {
      if (!shaSnackbarAlreadyShown) {
        showSnackbar({
          title: t('errorProcessingPayment', 'Error processing payment'),
          kind: 'error',
          subtitle: errorDetail,
          isLowContrast: true,
        });
      }
      return;
    }
    showSnackbar({
      title: t('partialPaymentSaved', 'Partial payment saved'),
      kind: 'warning',
      subtitle: t(
        'partialPaymentSavedSubtitle',
        '{{saved}} of {{total}} payment(s) saved. Reopen the bill to settle the remaining balance. Error: {{error}}',
        {
          saved: createdUuids.length,
          total: data.payments.length,
          error: shaSnackbarAlreadyShown ? t('seePreviousError', 'See previous error') : errorDetail,
        },
      ),
      isLowContrast: true,
    });
    closeWorkspace({ discardUnsavedChanges: true });
  };

  if (isLoadingPaymentModes) {
    return <InlineLoading status="active" iconDescription="Loading payment modes" />;
  }

  return (
    <Workspace2 hasUnsavedChanges={hasUnsavedChanges} title={t('paymentWorkspace', 'Payment workspace')}>
      <form onSubmit={formMethods.handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.formContainer}>
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title={t('totalAmountDueTitle', 'Total amount due')}
            subtitle={t(
              'totalAmountDueSubtitle',
              'The total amount due for the selected line items is {{totalAmount}}',
              {
                totalAmount: formatCurrency(totalAmount),
              },
            )}
          />
          <div className={styles.summary}>
            <InlineNotification
              kind={isFullyAllocated ? 'success' : 'warning'}
              lowContrast
              hideCloseButton
              title={
                isFullyAllocated
                  ? t('fullyAllocated', 'Fully allocated')
                  : remaining > 0
                  ? t('amountRemaining', 'Amount remaining')
                  : t('amountOverpaid', 'Amount overpaid')
              }
              subtitle={t('tenderedOfTotal', '{{tendered}} of {{total}} allocated {{remaining}} remaining', {
                tendered: formatCurrency(totalTendered),
                total: formatCurrency(totalAmount),
                remaining: formatCurrency(Math.abs(remaining)),
              })}
            />
            {shaError && (
              <InlineNotification
                kind="error"
                lowContrast
                title={t('shaRejectedLines', 'SHA rejected the bill lines')}
                subtitle={shaError}
                onCloseButtonClick={() => setShaError(null)}
              />
            )}
          </div>

          {fields.map((field, index) => {
            const selectedPaymentMode = watchedPayments?.[index]?.paymentMode;
            const showReferenceCode = (selectedPaymentMode?.attributeTypes?.length ?? 0) > 0;
            const modesUsedInOtherLines = (watchedPayments ?? [])
              .map((line, lineIndex) => (lineIndex === index ? undefined : line?.paymentMode?.uuid))
              .filter((uuid): uuid is string => Boolean(uuid));
            const availableModes = paymentModes.filter((mode) => !modesUsedInOtherLines.includes(mode.uuid));

            const showInterventionsPicker =
              requiresShaIntervention && selectedPaymentMode?.uuid === insurancePaymentMethod;

            const selectedInterventionCode = watchedPayments?.[index]?.interventionCode;
            const selectedIntervention = interventionItems.find((iv) => iv.code === selectedInterventionCode) ?? null;
            const isOverAmount = overAmountLineIndices.has(index);

            return (
              <div key={field.id} className={styles.paymentLine}>
                <ResponsiveWrapper>
                  <Controller
                    name={`payments.${index}.paymentMode`}
                    control={control}
                    render={({ field: { onChange } }) => (
                      <ComboBox
                        id={`paymentMode-${index}`}
                        itemToString={(item) => (item ? item.name : '')}
                        items={availableModes}
                        selectedItem={selectedPaymentMode ?? null}
                        onChange={({ selectedItem }) => {
                          onChange(selectedItem);
                          if (
                            selectedItem?.uuid !== insurancePaymentMethod &&
                            watchedPayments?.[index]?.interventionCode
                          ) {
                            formMethods.setValue(`payments.${index}.interventionCode`, undefined);
                          }
                        }}
                        titleText={t('paymentMode', 'Payment Mode')}
                        invalid={!!errors.payments?.[index]?.paymentMode}
                        invalidText={errors.payments?.[index]?.paymentMode?.message}
                      />
                    )}
                  />
                </ResponsiveWrapper>

                <ResponsiveWrapper>
                  <Controller
                    name={`payments.${index}.amount`}
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <>
                        <NumberInput
                          id={`amount-${index}`}
                          label={t('amount', 'Amount')}
                          allowEmpty
                          min={0}
                          value={value ?? ''}
                          onChange={(e, { value: nextValue }) =>
                            onChange(nextValue === '' || nextValue == null ? undefined : Number(nextValue))
                          }
                          size="md"
                          invalid={!!errors.payments?.[index]?.amount}
                          invalidText={errors.payments?.[index]?.amount?.message}
                        />
                      </>
                    )}
                  />
                </ResponsiveWrapper>

                {showReferenceCode && (
                  <ResponsiveWrapper>
                    <Controller
                      name={`payments.${index}.referenceCode`}
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <TextInput
                          id={`referenceCode-${index}`}
                          labelText={t('referenceCode', 'Reference Code')}
                          maxCount={50}
                          onChange={onChange}
                          placeholder={t('enterReferenceCode', 'Enter reference code')}
                          size="md"
                          type="text"
                          value={value ?? ''}
                          invalid={!!errors.payments?.[index]?.referenceCode}
                          invalidText={errors.payments?.[index]?.referenceCode?.message}
                        />
                      )}
                    />
                  </ResponsiveWrapper>
                )}

                {showInterventionsPicker && (
                  <ResponsiveWrapper>
                    <Controller
                      name={`payments.${index}.interventionCode`}
                      control={control}
                      render={({ field: { onChange } }) => (
                        <ComboBox
                          id={`intervention-${index}`}
                          titleText={t('shaIntervention', 'SHA intervention')}
                          helperText={t(
                            'shaInterventionHelper',
                            'Choose which active intervention this Insurance payment is recorded against.',
                          )}
                          placeholder={t('selectIntervention', 'Select intervention')}
                          items={interventionItems}
                          itemToString={(item: InterventionItem | null) => (item ? item.text : '')}
                          selectedItem={selectedIntervention}
                          onChange={({ selectedItem }) => {
                            if (selectedItem && (selectedItem as InterventionItem).disabled) {
                              return;
                            }
                            onChange(selectedItem ? (selectedItem as InterventionItem).code : undefined);
                          }}
                          shouldFilterItem={({ item, inputValue }: any) => {
                            if (!inputValue || !item) {
                              return true;
                            }
                            return item.text.toLowerCase().includes(inputValue.toLowerCase());
                          }}
                          invalid={!!errors.payments?.[index]?.interventionCode}
                          invalidText={errors.payments?.[index]?.interventionCode?.message}
                        />
                      )}
                    />

                    {selectedIntervention && (
                      <div className={styles.interventionSummary}>
                        <PomsfSchemeBalancePicker
                          patientUuid={patientUuid ?? ''}
                          patientCRId={(claimForVisit as any)?.beneficiary_cr_id ?? ''}
                          subBenefitCode={selectedIntervention.subBenefitCode ?? selectedIntervention.code}
                        />
                        <div className={styles.interventionSummaryRow}>
                          <code className={styles.interventionCode}>{selectedIntervention.code}</code>
                          <span className={styles.interventionName}>{selectedIntervention.name}</span>
                          {selectedIntervention.paymentMechanism && (
                            <Tag
                              size="sm"
                              type={
                                selectedIntervention.isPerDiem
                                  ? 'teal'
                                  : selectedIntervention.paymentMechanism === 'CAPITATION'
                                  ? 'blue'
                                  : 'gray'
                              }>
                              {selectedIntervention.isPerDiem
                                ? t('perDiem', 'Per diem')
                                : selectedIntervention.paymentMechanism === 'CAPITATION'
                                ? t('capitation', 'Capitation')
                                : selectedIntervention.paymentMechanism}
                            </Tag>
                          )}
                          {selectedIntervention.preauthApproved && (
                            <Tag size="sm" type="green">
                              {t('preauthApprovedTag', 'Preauth approved')}
                            </Tag>
                          )}
                        </div>

                        <div className={styles.interventionSummaryDetails}>
                          {selectedIntervention.isPerDiem ? (
                            <>
                              {selectedIntervention.accruedAmount != null && (
                                <div className={styles.interventionSummaryDetail}>
                                  <span className={styles.interventionSummaryDetailLabel}>
                                    {t('accruedAmount', 'Accrued')}
                                  </span>
                                  <span className={styles.interventionSummaryDetailValue}>
                                    {formatCurrency(selectedIntervention.accruedAmount)}
                                  </span>
                                </div>
                              )}
                              {selectedIntervention.accruedDays != null && (
                                <div className={styles.interventionSummaryDetail}>
                                  <span className={styles.interventionSummaryDetailLabel}>{t('days', 'Days')}</span>
                                  <span className={styles.interventionSummaryDetailValue}>
                                    {selectedIntervention.accruedDays}
                                  </span>
                                </div>
                              )}
                              {selectedIntervention.tariff != null && (
                                <div className={styles.interventionSummaryDetail}>
                                  <span className={styles.interventionSummaryDetailLabel}>
                                    {t('perDayRate', 'Per day')}
                                  </span>
                                  <span className={styles.interventionSummaryDetailValue}>
                                    {formatCurrency(selectedIntervention.tariff)}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {selectedIntervention.preauthApproved &&
                              selectedIntervention.preauthEstimatedAmount != null ? (
                                <>
                                  <div className={styles.interventionSummaryDetail}>
                                    <span className={styles.interventionSummaryDetailLabel}>
                                      {t('preauthApprovedAmount', 'SHA approved')}
                                    </span>
                                    <span className={styles.interventionSummaryDetailValue}>
                                      {formatCurrency(selectedIntervention.preauthEstimatedAmount)}
                                    </span>
                                  </div>
                                  {selectedIntervention.tariff != null &&
                                    Math.abs(
                                      selectedIntervention.tariff - selectedIntervention.preauthEstimatedAmount,
                                    ) > tariffPreauthDeltaThreshold && (
                                      <div className={styles.interventionSummaryDetail}>
                                        <span className={styles.interventionSummaryDetailLabel}>
                                          {t('catalogTariff', 'Catalog tariff')}
                                        </span>
                                        <span className={styles.interventionSummaryDetailValue}>
                                          {formatCurrency(selectedIntervention.tariff)}
                                        </span>
                                      </div>
                                    )}
                                </>
                              ) : (
                                selectedIntervention.tariff != null && (
                                  <div className={styles.interventionSummaryDetail}>
                                    <span className={styles.interventionSummaryDetailLabel}>
                                      {t('kephLevelTr', 'Tariff')}
                                    </span>
                                    <span className={styles.interventionSummaryDetailValue}>
                                      {formatCurrency(selectedIntervention.tariff)}
                                    </span>
                                  </div>
                                )
                              )}
                            </>
                          )}
                        </div>

                        {isOverAmount &&
                          selectedIntervention.isPerDiem &&
                          selectedIntervention.accruedAmount != null && (
                            <InlineNotification
                              kind="warning"
                              lowContrast
                              hideCloseButton
                              title={t('amountExceedsAccrued', 'Amount exceeds accrued')}
                              subtitle={t(
                                'maxPayableForDays',
                                'Maximum payable is {{max}} (accrued so far) for {{days}} {{dayLabel}} admitted',
                                {
                                  max: formatCurrency(selectedIntervention.accruedAmount),
                                  days: selectedIntervention.accruedDays ?? 0,
                                  dayLabel:
                                    (selectedIntervention.accruedDays ?? 0) === 1 ? t('day', 'day') : t('days', 'days'),
                                },
                              )}
                              className={styles.accruedWarning}
                            />
                          )}
                      </div>
                    )}
                  </ResponsiveWrapper>
                )}

                {fields.length > 1 && (
                  <Button
                    className={styles.removeButton}
                    kind="danger--ghost"
                    size="sm"
                    hasIconOnly
                    renderIcon={TrashCan}
                    iconDescription={t('removePayment', 'Remove payment')}
                    onClick={() => remove(index)}
                  />
                )}
              </div>
            );
          })}

          <Button
            kind="ghost"
            size="sm"
            renderIcon={Add}
            disabled={fields.length >= paymentModes.length || isFullyAllocated}
            onClick={() =>
              append({
                paymentMode: undefined,
                amount: undefined,
                referenceCode: undefined,
                interventionCode: undefined,
              })
            }>
            {t('addPaymentMode', 'Add payment mode')}
          </Button>
        </div>

        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            className={styles.button}
            disabled={isSubmitting || !isValid || !isFullyAllocated || hasOverAmount}
            kind="primary"
            type="submit">
            {isSubmitting ? (
              <InlineLoading className={styles.spinner} description={t('saving', 'Saving') + '...'} />
            ) : (
              <span>{t('saveAndClose', 'Save & close')}</span>
            )}
          </Button>
        </ButtonSet>
      </form>
    </Workspace2>
  );
};

export default PaymentWorkspace;
