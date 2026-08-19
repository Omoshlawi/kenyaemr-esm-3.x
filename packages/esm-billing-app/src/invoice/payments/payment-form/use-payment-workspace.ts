import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfig, useVisit, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { usePaymentModes } from '../../../billing.resource';
import { useCurrencyFormatting } from '../../../helpers/currency';
import { PaymentStatus } from '../../../types';
import { getPatientUuidFromUrl } from '../../../prompt-payment/prompt-payment-modal.component';
import { type BillingConfig } from '../../../config-schema';
import {
  useClaimForVisit,
  useVisitAttribute,
} from '../../../bill-administration/patient-billing/workspaces/create-bill/create-bill.resource';
import { type SupplementaryScheme } from '../../../billing-form/social-health-authority/type';
import { useFacilityRegistry } from '../../../hooks/useFacilityRegistry';

import { paymentFormSchema } from './payment.schema';
import { type PaymentModeFormData, type PaymentWorkspaceProps } from './payment.types';
import { useInterventions } from './use-interventions';
import { usePaymentSubmission } from './use-payment-submission';
import { buildAllocationLineItems, createPaymentLine, getOutstandingBalance } from './payment-submission.utils';
import { type PaymentContextValue } from './payment.context';
import { usePaymentAllocation } from './use-payment-allocation';

type UsePaymentWorkspaceArgs = {
  workspaceProps: PaymentWorkspaceProps;
  closeWorkspace: Workspace2DefinitionProps<PaymentWorkspaceProps, {}, {}>['closeWorkspace'];
};

/**
 * Encapsulates all of the payment workspace's business logic: bill/visit/claim data loading, derived
 * totals and allocation state, form setup and validation, SHA intervention handling, and submission.
 * The `payment.workspace` component consumes the returned view model and is purely presentational.
 */
export function usePaymentWorkspace({ workspaceProps, closeWorkspace }: UsePaymentWorkspaceArgs) {
  const selectedLineItems = workspaceProps?.selectedLineItems ?? [];
  const bill = workspaceProps.bill;
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [shaError, setShaError] = useState<string | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<SupplementaryScheme | null>(null);

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

  const { facilityLevel } = useFacilityRegistry();
  const isLevel2Facility = facilityLevel === '2';

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

  const isEmergencyClaim = claimForVisit.serviceType?.toUpperCase() === 'EMERGENCY';

  const resolverSchema = useMemo(
    () =>
      paymentFormSchema(
        totalAmount,
        t,
        insurancePaymentMethod,
        requiresShaIntervention,
        allowPartial,
        isEmergencyClaim,
      ),
    [totalAmount, t, insurancePaymentMethod, requiresShaIntervention, allowPartial, isEmergencyClaim],
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
        cap = intervention.tariff ?? null;
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
      isEmergencyClaim,
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
      isEmergencyClaim,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    isEmergencyClaim,
    allowPartial,
    manualAllocation,
    closeWorkspace,
    setShaError,
  });

  const addPaymentLine = () => append(createPaymentLine(manualAllocation ? allocationLineItems : []));

  return {
    // status
    isLoadingPaymentModes,
    hasUnsavedChanges,
    isSubmitting,

    // form wiring
    formMethods,
    paymentContextValue,
    onSubmit,

    // presentation data
    formatCurrency,
    totalAmount,
    allocation,
    allowPartial,

    // sha / effective cover
    shaError,
    setShaError,
    showEffectiveCoverPicker: isSHAVisit && Boolean(authorizationCode) && !isLevel2Facility,
    patientUuid: patientUuid ?? '',
    beneficiaryCrId,
    authorizationCode,
    setSelectedScheme,

    // payment lines
    fields,
    addPaymentLine,
    removePaymentLine: remove,
    isAddPaymentDisabled: fields.length >= paymentModes.length || isFullyAllocated,

    // submit gating
    isSubmitDisabled: isSubmitting || !isValid || !meetsAllocationRequirement || hasOverAmount || hasOverAllocation,
  };
}
