import { LineItem, MappedBill, Payment, PaymentMethod, PaymentStatus } from './types';
import { spaBasePath } from './constants';
import { type VirtualClaim } from './hooks/useClaimsMetrics';
import { toLineItemPayload, type LineItemPayload } from './invoice/payments/utils';

// Helper functions
const formatAmount = (amount: number): number => {
  return parseFloat(amount.toFixed(2));
};

const findWaiverPaymentMode = (paymentModes: PaymentMethod[]): PaymentMethod | undefined => {
  return paymentModes.find((mode) => mode.name.toLowerCase().includes('waiver'));
};

const createWaiverAttributes = (
  waiverPaymentMode: PaymentMethod | undefined,
  waiveReason: string,
): Array<{ attributeType: string | undefined; value: string }> => {
  if (!waiverPaymentMode?.uuid || !waiverPaymentMode.attributeTypes[0]) {
    return [];
  }

  return [
    {
      attributeType: waiverPaymentMode.attributeTypes[0].uuid,
      value: waiveReason,
    },
  ];
};

const createPaymentPayload = (
  payment: Payment,
): {
  amountTendered: number;
  amount: number;
  attributes: Array<{ attributeType: string | undefined; value: string }>;
  instanceType: string | undefined;
} => {
  return {
    amountTendered: formatAmount(payment.amountTendered),
    amount: formatAmount(payment.amount),
    attributes: payment.attributes.map((attribute) => ({
      attributeType: attribute.attributeType?.uuid,
      value: attribute.value,
    })),
    instanceType: payment?.instanceType?.uuid,
  };
};

/**
 * Creates a bill waiver payload for processing payments
 * @param bill - The mapped bill information
 * @param amountWaived - Amount to be waived
 * @param totalAmount - Total bill amount
 * @param lineItems - Array of line items in the bill
 * @param paymentModes - Available payment methods
 * @param waiveReason - Reason for waiving the amount
 * @returns Processed payment payload
 * @throws Error if required parameters are missing
 */
export const createBillWaiverPayload = (
  bill: MappedBill,
  amountWaived: number,
  totalAmount: number,
  lineItems: Array<LineItem>,
  paymentModes: Array<PaymentMethod>,
  waiveReason: string,
): {
  cashPoint: string;
  cashier: string;
  lineItems: Array<LineItem> | Array<LineItemPayload & { paymentStatus: PaymentStatus }>;
  payments: Array<any>;
  patient: string;
} => {
  // Input validation
  if (!bill || !lineItems.length || !paymentModes.length) {
    throw new Error('Missing required parameters for bill waiver payload');
  }

  const waiverPaymentMode = findWaiverPaymentMode(paymentModes);
  const waiverAttributes = createWaiverAttributes(waiverPaymentMode, waiveReason);

  const billPayment = {
    amount: formatAmount(amountWaived),
    amountTendered: formatAmount(amountWaived),
    attributes: waiverAttributes,
    instanceType: waiverPaymentMode?.uuid,
  };

  const previousPaymentsPayload = bill.payments.map(createPaymentPayload);

  const processedLineItems: Array<LineItemPayload & { paymentStatus: PaymentStatus }> = lineItems.map((lineItem) => ({
    ...toLineItemPayload(lineItem),
    paymentStatus: totalAmount === amountWaived ? PaymentStatus.PAID : PaymentStatus.POSTED,
  }));

  return {
    cashPoint: bill.cashPointUuid,
    cashier: bill.cashier.uuid,
    lineItems: processedLineItems,
    payments: [...previousPaymentsPayload, billPayment],
    patient: bill.patientUuid,
  };
};

function extractMessage(input: string): string | null {
  const parts = input?.split('=>');
  if (parts?.length > 0) {
    return parts[parts.length - 1].trim();
  }
  return null;
}

/**
 * Extracts error messages from a given error response object.
 * If fieldErrors are present, it extracts the error messages from each field.
 * If globalErrors are present, it extracts the error messages from each global error.
 * Otherwise, it returns the top-level error message.
 *
 * @param {ErrorObject} errorObject - The error response object.
 */
export function extractErrorMessagesFromResponse(errorObject): string {
  const { error: { fieldErrors, globalErrors, message } = {} } = errorObject ?? {};

  if (Object.keys(fieldErrors ?? {})?.length > 0) {
    return Object.values(fieldErrors)
      .flatMap((errors: Array<any>) => errors.map((error) => error.message))
      .join('\n');
  }

  if (globalErrors?.length) {
    return globalErrors.map((error) => error.message).join('\n');
  }

  return extractMessage(message) ?? 'An error occurred';
}

export const computeTotalPrice = (items) => {
  if (items && !items.length) {
    return 0;
  }

  let totalPrice = 0;

  items.forEach((item) => {
    const { price, quantity } = item;
    totalPrice += price * quantity;
  });

  return totalPrice;
};

export function waitForASecond(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Resolved after a seconds');
    }, 1000);
  });
}

export const computeWaivedAmount = (bill: MappedBill) => {
  if (!bill.payments) {
    return 0;
  }

  return bill.payments
    .filter((payment) => payment.instanceType.name.toLowerCase() === 'waiver')
    .reduce((curr: number, prev) => curr + Number(prev.amountTendered), 0);
};

export type ExternalApiErrorEntry = {
  raw: string;
  timestamp?: string;
  action?: string;
  http?: string;
  parsed?: {
    error?: string;
    message?: string;
    inner?: unknown;
    [key: string]: unknown;
  } | null;
};

export function parseExternalApiErrors(errString?: string): Array<ExternalApiErrorEntry> {
  if (!errString) {
    return [];
  }

  const entries: Array<ExternalApiErrorEntry> = [];
  const parts = errString
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const lineRegex = /^\[(.*?)\]\s*([^:]+):\s*(?:HTTP\s*(\d+):\s*)?(.*)$/s;

  for (const part of parts) {
    const firstLine = part.split(/\n/)[0];
    const match = firstLine.match(lineRegex);
    const entry: ExternalApiErrorEntry = { raw: part };

    if (!match) {
      try {
        entry.parsed = JSON.parse(part);
      } catch {
        entry.parsed = null;
      }

      entries.push(entry);
      continue;
    }

    entry.timestamp = match[1];
    entry.action = match[2]?.trim();
    entry.http = match[3];
    const rest = match[4]?.trim() ?? '';

    const candidate = rest || part;
    try {
      entry.parsed = JSON.parse(candidate);
    } catch {
      const firstBrace = candidate.indexOf('{');
      const lastBrace = candidate.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonSub = candidate.substring(firstBrace, lastBrace + 1);
        try {
          entry.parsed = JSON.parse(jsonSub);
        } catch {
          try {
            entry.parsed = JSON.parse(jsonSub.replace(/\\"/g, '"'));
          } catch {
            entry.parsed = null;
          }
        }
      } else {
        entry.parsed = null;
      }
    }

    if (entry.parsed && typeof entry.parsed.message === 'string') {
      const inner = entry.parsed.message;
      const innerFirst = inner.indexOf('{');
      const innerLast = inner.lastIndexOf('}');

      if (innerFirst !== -1 && innerLast > innerFirst) {
        const innerJson = inner.substring(innerFirst, innerLast + 1);

        try {
          entry.parsed.inner = JSON.parse(innerJson);
        } catch {
          try {
            entry.parsed.inner = JSON.parse(innerJson.replace(/\\"/g, '"'));
          } catch {
            entry.parsed.inner = null;
          }
        }
      }
    }

    entries.push(entry);
  }

  return entries;
}

// ─── Claims utilities ────────────────────────────────────────────────────────

export const CLAIMS_PAGE_SIZE = 10;
export const billingUrl = `${spaBasePath}/accounting/patient/\${patientUuid}/\${uuid}/claims`;

export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Main table
export const STAGE_CONFIG: Record<string, { label: string; type: string }> = {
  PAYER: { label: 'At Payer', type: 'blue' },
  PROVIDER: { label: 'Provider', type: 'green' },
  CLOSED: { label: 'Closed', type: 'gray' },
  DRAFT: { label: 'Draft', type: 'gray' },
};

export const SERVICE_TYPE_TAG: Record<string, string> = {
  INPATIENT: 'blue',
  OUTPATIENT: 'teal',
  CAPITATION: 'purple',
  EMERGENCY: 'red',
};

export const SERVICE_TYPES = ['Outpatient', 'Inpatient', 'Capitation', 'Emergency'];

export type StatusFilterKey = '' | 'DRAFT' | 'CLOSED' | 'AT_PAYER' | 'SENT_BACK' | 'APPROVED' | 'PAID';

export const STATUS_FILTERS: Array<{ value: StatusFilterKey; label: string }> = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'AT_PAYER', label: 'At Payer' },
  { value: 'SENT_BACK', label: 'Sent back' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CLOSED', label: 'Closed' },
];

export function matchesStatus(claim: VirtualClaim, key: StatusFilterKey): boolean {
  if (!key) {
    return true;
  }
  const stage = (claim.display_stage ?? '').toUpperCase();
  const payer = (claim.payer_workflow_state ?? '').toUpperCase();
  switch (key) {
    case 'DRAFT':
      return stage === 'DRAFT';
    case 'CLOSED':
      return stage === 'CLOSED';
    case 'AT_PAYER':
      return stage === 'PAYER' && payer !== 'SENT_BACK';
    case 'SENT_BACK':
      return payer === 'SENT_BACK';
    case 'APPROVED':
      return payer.includes('APPROVED') || payer === 'ELECTIVE_APPROVED';
    case 'PAID':
      return payer === 'PAYMENT_COMPLETED' || payer === 'PARTIALLY_PAID';
    default:
      return true;
  }
}

// Admin dashboard
export type TabKey = 'all' | 'submitted' | 'rejected' | 'returned' | 'paid' | 'draft' | 'closed';

export function filterByTab(claims: VirtualClaim[], tab: TabKey): VirtualClaim[] {
  switch (tab) {
    case 'submitted':
      return claims.filter(
        (c) =>
          c.display_stage === 'PAYER' ||
          c.provider_workflow_state === 'SUBMITTED' ||
          c.provider_workflow_state === 'FAILED_TO_SUBMIT',
      );
    case 'rejected':
      return claims.filter((c) => (c.payer_workflow_state ?? '').toUpperCase() === 'REJECTED');
    case 'returned':
      return claims.filter((c) => (c.payer_workflow_state ?? '').toUpperCase() === 'SENT_BACK');
    case 'paid':
      return claims.filter((c) => {
        const ps = (c.payer_workflow_state ?? '').toUpperCase();
        return ps === 'PAYMENT_COMPLETED' || ps === 'PARTIALLY_PAID';
      });
    case 'draft':
      return claims.filter((c) => c.display_stage === 'DRAFT');
    case 'closed':
      return claims.filter((c) => c.display_stage === 'CLOSED');
    default:
      return claims;
  }
}

export const STAGE_TAG: Record<string, { label: string; type: string }> = {
  PAYER: { label: 'At Payer', type: 'blue' },
  PROVIDER: { label: 'Provider', type: 'green' },
  CLOSED: { label: 'Closed', type: 'gray' },
  DRAFT: { label: 'Draft', type: 'gray' },
};

export const PAYER_TAG: Record<string, { label: string; type: string }> = {
  APPROVED: { label: 'Approved', type: 'green' },
  ELECTIVE_APPROVED: { label: 'Approved', type: 'green' },
  REJECTED: { label: 'Rejected', type: 'red' },
  SENT_BACK: { label: 'Returned', type: 'orange' },
  PAYMENT_COMPLETED: { label: 'Paid', type: 'teal' },
  PARTIALLY_PAID: { label: 'Partially Paid', type: 'teal' },
  MANUAL_REVIEW: { label: 'Manual Review', type: 'purple' },
  CLINICAL_REVIEW: { label: 'Clinical Review', type: 'purple' },
  MEDICAL_REVIEW: { label: 'Medical Review', type: 'purple' },
  SENT_FOR_PAYMENT_PROCESSING: { label: 'Processing', type: 'blue' },
};

export const adminTableHeaders = [
  { key: 'patient', header: 'Patient Name' },
  { key: 'date', header: 'Date' },
  { key: 'authCode', header: 'Auth Code' },
  { key: 'serviceType', header: 'Service Type' },
  { key: 'invoiceNo', header: 'Invoice No.' },
  { key: 'amount', header: 'Amount (KES)' },
  { key: 'status', header: 'Status' },
];
