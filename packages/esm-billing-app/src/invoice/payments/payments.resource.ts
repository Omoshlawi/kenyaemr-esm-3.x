import useSWR from 'swr';
import { openmrsFetch, OpenmrsResource, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { BillingConfig } from '../../config-schema';

type PaymentMethod = {
  uuid: string;
  description: string;
  name: string;
  retired: boolean;
};

const swrOption = {
  errorRetryCount: 2,
};

export interface PaymentStatusResponse {
  success: boolean;
  message: string;
  data?: Data;
}

export interface Data {
  id: number;
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber?: string;
  OrgAccountBalance: string;
  ThirdPartyTransID?: string;
  MSISDN: string;
  FirstName: string;
  MiddleName?: string;
  LastName?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const usePaymentModes = () => {
  const { excludedPaymentMode } = useConfig<BillingConfig>();
  const url = `/ws/rest/v1/cashier/paymentMode`;
  const { data, isLoading, error, mutate } = useSWR<{ data: { results: Array<PaymentMethod> } }>(
    url,
    openmrsFetch,
    swrOption,
  );
  const allowedPaymentModes =
    excludedPaymentMode?.length > 0
      ? data?.data?.results.filter((mode) => !excludedPaymentMode.some((excluded) => excluded.uuid === mode.uuid)) ?? []
      : data?.data?.results ?? [];
  return {
    paymentModes: allowedPaymentModes,
    isLoading,
    mutate,
    error,
  };
};

export const checkPaymentStatus = (transactionId: string) => {
  const url = `${restBaseUrl}/rmsdataexchange/api/rmsmpesachecker?transactionId=${transactionId}`;
  return openmrsFetch<PaymentStatusResponse>(url);
};

export const makePayment = (billUuid: string, paymentPayload: Record<string, any>) => {
  const url = `${restBaseUrl}/cashier/bill/${billUuid}/payment`;
  return openmrsFetch<PaymentResponse>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: paymentPayload,
  });
};

/**
 * Records a payment against the allocation-aware endpoint. The payload must include an
 * `allocations` array of `{ lineItem, amount }` whose amounts total the payment amount exactly.
 * Used only by the partial-payment path; the legacy `makePayment` contract is left untouched.
 */
export const makeAllocatedPayment = (billUuid: string, paymentPayload: Record<string, any>) => {
  const url = `${restBaseUrl}/cashier/bill/${billUuid}/allocatedPayment`;
  return openmrsFetch<PaymentResponse>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: paymentPayload,
  });
};

export interface PaymentResponse {
  uuid: string;
  instanceType: OpenmrsResource;
  attributes: Array<Attribute>;
  amount: number;
  amountTendered: number;
  item: any;
  dateCreated: number;
  voided: boolean;
  resourceVersion: string;
}

interface Attribute {
  uuid: string;
  display: string;
  voided: boolean;
  voidReason: any;
  value: string;
  attributeType: AttributeType;
  order: number;
  valueName: string;
  resourceVersion: string;
}

interface AttributeType {
  uuid: string;
  name: string;
  description: string;
  retired: boolean;
  attributeOrder: number;
  format: string;
  foreignKey: any;
  regExp: any;
  required: boolean;
}
