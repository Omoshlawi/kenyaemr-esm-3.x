import { LineItem, MappedBill, Payment, PaymentMethod, PaymentStatus } from './types';

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
): Array<{ attributeType: string; value: string }> => {
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
  lineItems: Array<LineItem>;
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
    amount: formatAmount(totalAmount),
    amountTendered: formatAmount(amountWaived),
    attributes: waiverAttributes,
    instanceType: waiverPaymentMode?.uuid,
  };

  const previousPaymentsPayload = bill.payments.map(createPaymentPayload);

  const processedLineItems = lineItems.map((lineItem) => ({
    ...lineItem,
    billableService: processBillItem(lineItem),
    item: processBillItem(lineItem),
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

const processBillItem = (item) => (item?.item || item?.billableService)?.split(':')[0];

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
  const {
    error: { fieldErrors, globalErrors, message },
  } = errorObject ?? {};

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
