import { useMemo } from 'react';

import { type PaymentLine } from './payment.types';

type UsePaymentAllocationArgs = {
  totalAmount: number;
  payments: Array<PaymentLine> | undefined;
  allowPartial: boolean;
};

export type PaymentAllocation = {
  totalTendered: number;
  remaining: number;
  isFullyAllocated: boolean;
  isOverpaid: boolean;
  isPartial: boolean;
  /**
   * Whether the current tender satisfies the requirement to save. In full mode the payments must
   * settle the selected line items exactly; in partial mode any positive tender that does not
   * exceed the total is acceptable.
   */
  meetsAllocationRequirement: boolean;
};

export function usePaymentAllocation({
  totalAmount,
  payments,
  allowPartial,
}: UsePaymentAllocationArgs): PaymentAllocation {
  return useMemo(() => {
    const totalTendered = (payments ?? []).reduce((acc, line) => acc + (Number(line?.amount) || 0), 0);
    const remainingCents = Math.round(totalAmount * 100) - Math.round(totalTendered * 100);
    const remaining = remainingCents / 100;
    const isFullyAllocated = remainingCents === 0;
    const isOverpaid = remainingCents < 0;
    const hasTender = totalTendered > 0;

    return {
      totalTendered,
      remaining,
      isFullyAllocated,
      isOverpaid,
      isPartial: allowPartial && hasTender && remainingCents > 0,
      meetsAllocationRequirement: allowPartial ? hasTender && !isOverpaid : isFullyAllocated,
    };
  }, [totalAmount, payments, allowPartial]);
}
