import React, { useEffect, useState } from 'react';
import {
  ResponsiveWrapper,
  restBaseUrl,
  showModal,
  showSnackbar,
  useLayoutType,
  Workspace2,
  Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { Button, ButtonSet, ComboBox, InlineLoading, InlineNotification, NumberInput, TextInput } from '@carbon/react';
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

import styles from './payment.workspace.scss';

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
};

type PaymentModeFormData = {
  payments: Array<PaymentLine>;
};

const paymentLineSchema = (t: TFunction) =>
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
    });

const paymentFormSchema = (totalAmount: number, t: TFunction) =>
  z
    .object({
      payments: z.array(paymentLineSchema(t)).min(1, t('atLeastOnePayment', 'Add at least one payment')),
    })
    .superRefine((data, ctx) => {
      const totalTendered = data.payments.reduce((acc, line) => acc + (Number(line.amount) || 0), 0);
      // Compare in cents to avoid floating point drift (e.g. 8000.001 !== 8000).
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
  const isTablet = useLayoutType() === 'tablet';

  const unPaidLineItems = selectedLineItems.filter((item) => item.paymentStatus !== PaymentStatus.PAID);
  const totalAmount = unPaidLineItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const billLineItemsUuids = unPaidLineItems.map((item) => item.uuid);

  const { paymentModes, isLoading: isLoadingPaymentModes } = usePaymentModes();

  const formMethods = useForm<PaymentModeFormData>({
    resolver: zodResolver(paymentFormSchema(totalAmount, t)),
    mode: 'onTouched',
    defaultValues: {
      payments: [{ paymentMode: undefined, amount: undefined, referenceCode: undefined }],
    },
  });

  const {
    control,
    formState: { isSubmitting, errors, isValid, isDirty },
  } = formMethods;

  const { fields, append, remove } = useFieldArray({ control, name: 'payments' });

  const watchedPayments = useWatch({ control, name: 'payments' });
  const totalTendered = (watchedPayments ?? []).reduce((acc, line) => acc + (Number(line?.amount) || 0), 0);
  const remaining = totalAmount - totalTendered;

  useEffect(() => {
    if (isDirty) {
      setHasUnsavedChanges(isDirty);
    }
  }, [isDirty, setHasUnsavedChanges]);

  const handlePrintReceipt = (paymentsUuids: Array<string>) => {
    const lineItemUuids = unPaidLineItems.map((item) => item.uuid);
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

    const errorDetail = extractErrorMessagesFromResponse((failureError as { responseBody?: unknown })?.responseBody);

    if (createdUuids.length === 0) {
      showSnackbar({
        title: t('errorProcessingPayment', 'Error processing payment'),
        kind: 'error',
        subtitle: errorDetail,
        isLowContrast: true,
      });
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
          error: errorDetail,
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
              kind={remaining === 0 ? 'success' : 'warning'}
              lowContrast
              hideCloseButton
              title={
                remaining === 0
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
          </div>

          {fields.map((field, index) => {
            const selectedPaymentMode = watchedPayments?.[index]?.paymentMode;
            const showReferenceCode = (selectedPaymentMode?.attributeTypes?.length ?? 0) > 0;
            const modesUsedInOtherLines = (watchedPayments ?? [])
              .map((line, lineIndex) => (lineIndex === index ? undefined : line?.paymentMode?.uuid))
              .filter((uuid): uuid is string => Boolean(uuid));
            const availableModes = paymentModes.filter((mode) => !modesUsedInOtherLines.includes(mode.uuid));

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
                        onChange={({ selectedItem }) => onChange(selectedItem)}
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
                          step={0.01}
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
            disabled={fields.length >= paymentModes.length}
            onClick={() => append({ paymentMode: undefined, amount: undefined, referenceCode: undefined })}>
            {t('addPaymentMode', 'Add payment mode')}
          </Button>
        </div>

        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            className={styles.button}
            disabled={isSubmitting || !isValid || remaining !== 0}
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
