import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useConfig, useLayoutType, useVisit, Workspace2, Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { Button, ButtonSet, InlineLoading, InlineNotification } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import classNames from 'classnames';
import { FormProvider, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { usePaymentModes } from '../../../billing.resource';
import { useCurrencyFormatting } from '../../../helpers/currency';
import { PaymentStatus } from '../../../types';
import { getPatientUuidFromUrl } from '../../../prompt-payment/prompt-payment-modal.component';
import { BillingConfig } from '../../../config-schema';
import {
  useClaimForVisit,
  useVisitAttribute,
} from '../../../bill-administration/patient-billing/workspaces/create-bill/create-bill.resource';
import { type SupplementaryScheme } from '../../../billing-form/social-health-authority/type';
import EffectiveCoverPicker from '../../../billing-form/pomsf/effective-pomsf.component';

import { paymentFormSchema } from './payment.schema';
import { type PaymentModeFormData, type PaymentWorkspaceProps } from './payment.types';
import { useInterventions } from './use-interventions';
import { usePaymentSubmission } from './use-payment-submission';
import { buildAllocationLineItems, createPaymentLine, getOutstandingBalance } from './payment-submission.utils';
import { PaymentProvider, type PaymentContextValue } from './payment.context';
import { usePaymentAllocation } from './use-payment-allocation';
import PaymentLine from './payment-line.component';
import AllocationSummary from './allocation-summary.component';
import styles from './payment.workspace.scss';

const PaymentWorkspace: React.FC<Workspace2DefinitionProps<PaymentWorkspaceProps, {}, {}>> = ({
  workspaceProps,
  closeWorkspace,
}) => {
  const selectedLineItems = workspaceProps?.selectedLineItems ?? [];
  const bill = workspaceProps!.bill;
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [shaError, setShaError] = useState<string | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<SupplementaryScheme | null>(null);
  const isTablet = useLayoutType() === 'tablet';

  const {
    visitAttributeTypes: { insuranceScheme },
    insurancePaymentMethod,
    enablePartialBillPayment,
  } = useConfig<BillingConfig>();
  const allowPartial = Boolean(enablePartialBillPayment);

  const unPaidLineItems = selectedLineItems.filter((item) => item.paymentStatus !== PaymentStatus.PAID);
  const totalAmount = allowPartial
    ? unPaidLineItems.reduce((acc, curr) => acc + getOutstandingBalance(curr), 0)
    : unPaidLineItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const billLineItemsUuids = unPaidLineItems.map((item) => item.uuid);

  const { paymentModes = [], isLoading: isLoadingPaymentModes } = usePaymentModes();
  const patientUuid = getPatientUuidFromUrl();

  const { activeVisit } = useVisit(patientUuid);
  const visitUuid = activeVisit?.uuid;

  const { isSHA: isSHAVisit } = useVisitAttribute(visitUuid ?? '', insuranceScheme);
  const claimForVisit = useClaimForVisit(visitUuid ?? '');

  const manualAllocation = allowPartial && unPaidLineItems.length > 1;
  const allocationSignature = unPaidLineItems.map((item) => `${item.uuid}:${getOutstandingBalance(item)}`).join('|');
  const allocationLineItems = useMemo(
    () => buildAllocationLineItems(unPaidLineItems),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allocationSignature],
  );

  const interventionItems = useInterventions({ claimForVisit, unPaidLineItems, formatCurrency, t });

  const authorizationCode = claimForVisit.authorizationCode ?? null;
  const beneficiaryCrId = ((claimForVisit as any)?.beneficiary_cr_id as string | undefined) ?? '';
  const requiresShaIntervention = isSHAVisit && interventionItems.length > 0;

  const resolverSchema = useMemo(
    () => paymentFormSchema(totalAmount, t, insurancePaymentMethod, requiresShaIntervention, allowPartial),
    [totalAmount, t, insurancePaymentMethod, requiresShaIntervention, allowPartial],
  );

  const formMethods = useForm<PaymentModeFormData>({
    resolver: zodResolver(resolverSchema),
    mode: 'onTouched',
    defaultValues: {
      payments: [createPaymentLine(manualAllocation ? allocationLineItems : [])],
    },
  });

  const {
    control,
    trigger,
    formState: { isSubmitting, isValid, isDirty },
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
  const allocation = usePaymentAllocation({ totalAmount, payments: watchedPayments, allowPartial });
  const { isFullyAllocated, meetsAllocationRequirement } = allocation;

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

  const overAllocatedLineItemUuids = useMemo(() => {
    if (!manualAllocation) {
      return new Set<string>();
    }
    const allocatedCentsByLineItem = new Map<string, number>();
    (watchedPayments ?? []).forEach((line) => {
      (line?.allocations ?? []).forEach((entry) => {
        if (!entry?.lineItem) {
          return;
        }
        const cents = Math.round((Number(entry.amount) || 0) * 100);
        allocatedCentsByLineItem.set(entry.lineItem, (allocatedCentsByLineItem.get(entry.lineItem) ?? 0) + cents);
      });
    });
    const balanceCentsByLineItem = new Map(
      allocationLineItems.map((item) => [item.uuid, Math.round(item.balance * 100)]),
    );
    const result = new Set<string>();
    allocatedCentsByLineItem.forEach((cents, uuid) => {
      if (cents > (balanceCentsByLineItem.get(uuid) ?? 0)) {
        result.add(uuid);
      }
    });
    return result;
  }, [manualAllocation, watchedPayments, allocationLineItems]);

  const hasOverAllocation = overAllocatedLineItemUuids.size > 0;

  const paymentContextValue = useMemo<PaymentContextValue>(
    () => ({
      paymentModes,
      interventionItems,
      insurancePaymentMethod,
      requiresShaIntervention,
      overAmountLineIndices,
      formatCurrency,
      manualAllocation,
      allocationLineItems,
      overAllocatedLineItemUuids,
    }),
    [
      paymentModes,
      interventionItems,
      insurancePaymentMethod,
      requiresShaIntervention,
      overAmountLineIndices,
      formatCurrency,
      manualAllocation,
      allocationLineItems,
      overAllocatedLineItemUuids,
    ],
  );

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

  const onSubmit = usePaymentSubmission({
    bill,
    unPaidLineItems,
    billLineItemsUuids,
    isSHAVisit,
    authorizationCode,
    selectedScheme,
    insurancePaymentMethod,
    interventionItems,
    allowPartial,
    manualAllocation,
    closeWorkspace,
    setShaError,
  });

  if (isLoadingPaymentModes) {
    return <InlineLoading status="active" iconDescription="Loading payment modes" />;
  }

  return (
    <Workspace2 hasUnsavedChanges={hasUnsavedChanges} title={t('paymentWorkspace', 'Payment workspace')}>
      <FormProvider {...formMethods}>
        <PaymentProvider value={paymentContextValue}>
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
                <AllocationSummary
                  allocation={allocation}
                  totalAmount={totalAmount}
                  allowPartial={allowPartial}
                  formatCurrency={formatCurrency}
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

              {isSHAVisit && authorizationCode && (
                <EffectiveCoverPicker
                  patientUuid={patientUuid ?? ''}
                  patientCRId={beneficiaryCrId}
                  consentToken={authorizationCode}
                  onSchemeSelected={setSelectedScheme}
                />
              )}

              {fields.map((field, index) => (
                <PaymentLine key={field.id} index={index} fieldsLength={fields.length} onRemove={remove} />
              ))}

              <Button
                kind="ghost"
                size="sm"
                renderIcon={Add}
                disabled={fields.length >= paymentModes.length || isFullyAllocated}
                onClick={() => append(createPaymentLine(manualAllocation ? allocationLineItems : []))}>
                {t('addPaymentMode', 'Add payment mode')}
              </Button>
            </div>

            <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
              <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button
                className={styles.button}
                disabled={isSubmitting || !isValid || !meetsAllocationRequirement || hasOverAmount || hasOverAllocation}
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
        </PaymentProvider>
      </FormProvider>
    </Workspace2>
  );
};

export default PaymentWorkspace;
