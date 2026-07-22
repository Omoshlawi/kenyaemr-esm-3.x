import { createContext, useContext } from 'react';

import { type InterventionItem, type PaymentModes } from './payment.types';
import { type AllocationLineItem } from './payment-submission.utils';

export type PaymentContextValue = {
  paymentModes: PaymentModes;
  interventionItems: Array<InterventionItem>;
  insurancePaymentMethod: string;
  requiresShaIntervention: boolean;
  overAmountLineIndices: Set<number>;
  formatCurrency: (amount: number) => string;
  manualAllocation: boolean;
  allocationLineItems: Array<AllocationLineItem>;
  overAllocatedLineItemUuids: Set<string>;
};

const PaymentContext = createContext<PaymentContextValue | null>(null);

export const PaymentProvider = PaymentContext.Provider;

export function usePaymentContext(): PaymentContextValue {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePaymentContext must be used within a PaymentProvider');
  }
  return context;
}
