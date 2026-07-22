import { type usePaymentModes } from '../../../billing.resource';
import { type LineItem, type MappedBill } from '../../../types';

export type PaymentWorkspaceProps = {
  selectedLineItems: Array<LineItem>;
  bill: MappedBill;
};

export type PaymentModes = NonNullable<ReturnType<typeof usePaymentModes>['paymentModes']>;

export type PaymentModeOption = PaymentModes[number] & {
  attributeTypes?: Array<{
    uuid: string;
    name?: string;
    required?: boolean;
  }>;
};

export type PaymentLineAllocation = {
  lineItem: string;
  amount?: number;
};

export type PaymentLine = {
  paymentMode?: PaymentModeOption;
  amount?: number;
  referenceCode?: string;
  interventionCode?: string;
  allocations?: Array<PaymentLineAllocation>;
};

export type PaymentModeFormData = {
  payments: Array<PaymentLine>;
};

export type InterventionItem = {
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
