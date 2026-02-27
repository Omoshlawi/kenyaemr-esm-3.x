import React, { useEffect } from 'react';
import {
  DefaultWorkspaceProps,
  ResponsiveWrapper,
  restBaseUrl,
  showModal,
  showSnackbar,
  useLayoutType,
} from '@openmrs/esm-framework';
import { Button, ButtonSet, ComboBox, InlineLoading, InlineNotification, NumberInput, TextInput } from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import startCase from 'lodash-es/startCase';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import { z } from 'zod';

import { usePaymentModes } from '../../../billing.resource';
import { formatCurrency } from '../../../helpers/currency';
import { PaymentMode, PaymentStatus, type LineItem, type MappedBill } from '../../../types';
import { extractErrorMessagesFromResponse } from '../../../utils';
import { makePayment } from '../payments.resource';

import styles from './payment.workspace.scss';

type PaymentWorkspaceProps = DefaultWorkspaceProps & {
  selectedLineItems: Array<LineItem>;
  bill: MappedBill;
};

type PaymentModeFormData = {
  paymentMode: PaymentMode;
  amount: number;
  referenceCode?: string;
};

const paymentModeFormSchema = (amountDue: number) =>
  z
    .object({
      paymentMode: z.object({
        uuid: z.string(),
        name: z.string(),
        attributeTypes: z
          .array(
            z
              .object({
                required: z.boolean().optional(),
              })
              .passthrough(),
          )
          .optional(),
      }),
      amount: z.number(),
      referenceCode: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.amount !== amountDue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message: 'Amount must equal amount due',
        });
      }

      const requiresReferenceCode = data.paymentMode.attributeTypes?.some((attr) => attr.required) ?? false;

      if (requiresReferenceCode && !data.referenceCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['referenceCode'],
          message: 'Reference code is required for this payment mode',
        });
      }
    });

const PaymentWorkspace: React.FC<PaymentWorkspaceProps> = ({
  selectedLineItems,
  bill,
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const unPaidLineItems = selectedLineItems.filter((item) => item.paymentStatus !== PaymentStatus.PAID);
  const totalAmount = unPaidLineItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const billLineItemsUuids = unPaidLineItems.map((item) => item.uuid);

  const { paymentModes, isLoading: isLoadingPaymentModes } = usePaymentModes();

  const formMethods = useForm<PaymentModeFormData>({
    resolver: zodResolver(paymentModeFormSchema(totalAmount)),
    mode: 'all',
    defaultValues: {
      paymentMode: undefined,
      amount: undefined,
      referenceCode: undefined,
    },
  });

  const {
    formState: { isSubmitting, errors, isValid, isDirty },
  } = formMethods;

  const selectedPaymentMode = formMethods.watch('paymentMode');
  const doesSelectedPaymentModeRequireReferenceCode = selectedPaymentMode?.attributeTypes?.length > 0;

  useEffect(() => {
    if (isDirty) {
      promptBeforeClosing(() => isDirty);
    }
  }, [isDirty, promptBeforeClosing]);

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
    const paymentPayload = {
      instanceType: data.paymentMode.uuid,
      amount: totalAmount,
      amountTendered: data.amount,
      attributes: data.referenceCode
        ? [{ attributeType: data.paymentMode.attributeTypes[0].uuid, value: data.referenceCode }]
        : [],
      lineItemsToMarkPaid: billLineItemsUuids,
    };

    let shouldCloseWorkspace = false;

    try {
      const response = await makePayment(bill.uuid, paymentPayload);
      if (response.ok) {
        showSnackbar({
          title: t('paymentSaved', 'Payment saved'),
          kind: 'success',
          subtitle: t('paymentSavedSuccessfully', 'Payment saved successfully'),
        });
        const url = `${restBaseUrl}/cashier/bill/${bill.uuid}`;
        mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });
        handlePrintReceipt([response.data.uuid]);
        shouldCloseWorkspace = true;
      }
    } catch (error) {
      showSnackbar({
        title: t('errorProcessingPayment', 'Error processing payment'),
        kind: 'error',
        subtitle: extractErrorMessagesFromResponse(error?.responseBody),
        isLowContrast: true,
      });
    } finally {
      if (shouldCloseWorkspace) {
        closeWorkspaceWithSavedChanges();
      }
    }
  };

  if (isLoadingPaymentModes) {
    return <InlineLoading status="active" iconDescription="Loading payment modes" />;
  }

  return (
    <form onSubmit={formMethods.handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.formContainer}>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title={t('totalAmountDueTitle', 'Total amount due')}
          subtitle={t('totalAmountDueSubtitle', 'The total amount due for the selected line items is {{totalAmount}}', {
            totalAmount: formatCurrency(totalAmount),
          })}
        />

        <ResponsiveWrapper>
          <Controller
            name="paymentMode"
            control={formMethods.control}
            render={({ field }) => (
              <ComboBox
                id="paymentMode"
                itemToString={(item) => (item ? item.name : '')}
                items={paymentModes}
                onChange={({ selectedItem }) => field.onChange(selectedItem)}
                titleText="Payment Mode"
                invalid={!!errors.paymentMode}
                invalidText={errors.paymentMode?.message}
              />
            )}
          />
        </ResponsiveWrapper>

        <ResponsiveWrapper>
          <Controller
            name="amount"
            control={formMethods.control}
            render={({ field }) => (
              <NumberInput
                id="amount"
                label={t('amount', 'Amount')}
                max={totalAmount}
                min={0}
                onChange={(e, { value }) => field.onChange(Number(value))}
                size="md"
                step={0.01}
                invalid={!!errors.amount}
                invalidText={errors.amount?.message}
              />
            )}
          />
        </ResponsiveWrapper>

        {doesSelectedPaymentModeRequireReferenceCode && (
          <ResponsiveWrapper>
            <Controller
              name="referenceCode"
              control={formMethods.control}
              render={({ field }) => (
                <TextInput
                  id="referenceCode"
                  labelText={t('referenceCode', 'Reference Code')}
                  maxCount={10}
                  onChange={field.onChange}
                  placeholder="Enter reference code"
                  size="md"
                  type="text"
                  value={field.value}
                  invalid={!!errors.referenceCode}
                  invalidText={errors.referenceCode?.message}
                />
              )}
            />
          </ResponsiveWrapper>
        )}
      </div>

      <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
        <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button className={styles.button} disabled={isSubmitting || !isValid} kind="primary" type="submit">
          {isSubmitting ? (
            <InlineLoading className={styles.spinner} description={t('saving', 'Saving') + '...'} />
          ) : (
            <span>{t('saveAndClose', 'Save & close')}</span>
          )}
        </Button>
      </ButtonSet>
    </form>
  );
};

export default PaymentWorkspace;
