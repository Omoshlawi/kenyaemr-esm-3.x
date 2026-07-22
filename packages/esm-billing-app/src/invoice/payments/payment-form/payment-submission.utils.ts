import { mutate } from 'swr';
import { restBaseUrl } from '@openmrs/esm-framework';

import { type LineItem, type MappedBill, PaymentStatus } from '../../../types';
import { type PaymentLine, type PaymentLineAllocation } from './payment.types';

export type PaymentAllocationEntry = { lineItem: string; amount: number };

export type AllocationLineItem = { uuid: string; label: string; balance: number };

export function getLineItemLabel(item: LineItem): string {
  return (item.item || item.billableService)?.split(':')[1]?.trim() || item.display || item.uuid;
}

export function buildAllocationLineItems(lineItems: Array<LineItem>): Array<AllocationLineItem> {
  return lineItems.map((item) => ({
    uuid: item.uuid,
    label: getLineItemLabel(item),
    balance: getOutstandingBalance(item),
  }));
}

export function createPaymentLine(allocationLineItems: Array<AllocationLineItem> = []): PaymentLine {
  return {
    paymentMode: undefined,
    amount: undefined,
    referenceCode: undefined,
    interventionCode: undefined,
    allocations: allocationLineItems.length
      ? allocationLineItems.map((li) => ({ lineItem: li.uuid, amount: undefined }))
      : undefined,
  };
}

/**
 * Sums a payment line's manual per-line-item allocations into its total, working in integer cents
 * so the derived amount matches the allocation sum exactly (the allocatedPayment endpoint compares
 * amount against the summed allocations with BigDecimal equality).
 */
export function sumAllocationAmount(allocations: Array<PaymentLineAllocation> | undefined): number {
  const cents = (allocations ?? []).reduce((acc, entry) => acc + Math.round((Number(entry?.amount) || 0) * 100), 0);
  return cents / 100;
}

/**
 * Maps a payment line's manual allocations to the endpoint payload shape, dropping empty/zero entries.
 */
export function buildExplicitAllocations(line: PaymentLine): Array<PaymentAllocationEntry> {
  return (line.allocations ?? [])
    .filter((entry) => (Number(entry?.amount) || 0) > 0)
    .map((entry) => ({ lineItem: entry.lineItem, amount: Number(entry.amount) }));
}

function buildAttributes(line: PaymentLine) {
  return line.referenceCode && line.paymentMode?.attributeTypes?.length
    ? [{ attributeType: line.paymentMode.attributeTypes[0].uuid, value: line.referenceCode }]
    : [];
}

export function buildPaymentPayload(line: PaymentLine, lineItemsToMarkPaid: Array<string>) {
  return {
    instanceType: line.paymentMode!.uuid,
    amount: line.amount,
    amountTendered: line.amount,
    attributes: buildAttributes(line),
    lineItemsToMarkPaid,
  };
}

export function buildAllocatedPaymentPayload(line: PaymentLine, allocations: Array<PaymentAllocationEntry>) {
  return {
    instanceType: line.paymentMode!.uuid,
    amount: line.amount,
    amountTendered: line.amount,
    attributes: buildAttributes(line),
    allocations,
  };
}

export function isLineItemSettled(item: LineItem): boolean {
  if (item.settlementStatus) {
    return item.settlementStatus === 'PAID' || item.settlementStatus === 'EXEMPTED';
  }
  return item.paymentStatus === PaymentStatus.PAID || item.paymentStatus === PaymentStatus.EXEMPTED;
}

/**
 * Outstanding amount owed on a line item. Prefers the backend-computed `balance` (which nets out
 * prior allocations and applied deposits) and falls back to price * quantity for older backends
 * that do not return it. Settled (paid/exempted) lines owe nothing.
 */
export function getOutstandingBalance(item: LineItem): number {
  if (isLineItemSettled(item)) {
    return 0;
  }
  return item.balance != null ? item.balance : item.price * item.quantity;
}

/**
 * Distributes each payment's amount across the line items with an outstanding balance, filling
 * them in order. Works in integer cents so each payment's allocations total its amount exactly,
 * as required by the allocatedPayment endpoint. Assumes total tendered does not exceed the
 * combined outstanding balance (enforced by the payment form schema in partial mode).
 */
export function buildAllocationsForPayments(
  payments: Array<PaymentLine>,
  lineItems: Array<LineItem>,
): Array<Array<PaymentAllocationEntry>> {
  const capacities = lineItems.map((item) => ({
    uuid: item.uuid,
    cents: Math.round(getOutstandingBalance(item) * 100),
  }));

  let cursor = 0;
  return payments.map((payment) => {
    let remaining = Math.round((Number(payment.amount) || 0) * 100);
    const allocations: Array<PaymentAllocationEntry> = [];

    while (remaining > 0 && cursor < capacities.length) {
      const capacity = capacities[cursor];
      if (capacity.cents <= 0) {
        cursor += 1;
        continue;
      }
      const take = Math.min(remaining, capacity.cents);
      allocations.push({ lineItem: capacity.uuid, amount: take / 100 });
      capacity.cents -= take;
      remaining -= take;
      if (capacity.cents === 0) {
        cursor += 1;
      }
    }

    return allocations;
  });
}

export function buildReceiptUrl(bill: MappedBill, lineItemUuids: Array<string>, paymentsUuids: Array<string>) {
  return `${window.openmrsBase}${restBaseUrl}/cashier/receipt?billId=${bill.id}&lineItemUuids=${lineItemUuids.join(
    ',',
  )}&paymentsUuids=${paymentsUuids.join(',')}`;
}

export function revalidateBillCaches(billUuid: string) {
  const cacheUrl = `${restBaseUrl}/cashier/bill/${billUuid}`;
  mutate((key) => typeof key === 'string' && key.startsWith(cacheUrl), undefined, { revalidate: true });
  mutate((key) => typeof key === 'string' && key.includes('virtualclaims/claim-for-visit'), undefined, {
    revalidate: true,
  });
  mutate((key) => typeof key === 'string' && key.includes('authorizations/effective-cover'), undefined, {
    revalidate: true,
  });
}
