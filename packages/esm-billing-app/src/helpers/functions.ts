import dayjs from 'dayjs';
import { Payment, LineItem } from '../types';
import { formatCurrency } from './currency';

// amount already paid
export function calculateTotalAmountTendered(payments: Array<Payment>) {
  return Array.isArray(payments)
    ? payments.reduce((totalAmount, item) => {
        // Ensure that "amount" property is present and numeric
        if (typeof item.amount === 'number' && item.voided !== true) {
          return totalAmount + item.amount;
        }
        return totalAmount;
      }, 0)
    : 0;
}

// balance
export function calculateTotalBalance(lineItems: Array<LineItem>, payments: Array<Payment>) {
  return Math.min(this.calculateTotalAmount(lineItems) - this.calculateTotalAmountTendered(payments));
}

// total bill
export function calculateTotalAmount(lineItems: Array<LineItem>) {
  return Array.isArray(lineItems)
    ? lineItems.reduce((totalAmount, item) => {
        // Ensure that "price" and "quantity" properties are present and numeric
        if (typeof item.price === 'number' && typeof item.quantity === 'number' && item.voided !== true) {
          return totalAmount + item.price * item.quantity;
        }
        return totalAmount;
      }, 0)
    : 0;
}

export const convertToCurrency = (amountToConvert: number) => {
  return formatCurrency(amountToConvert);
};

export const getGender = (gender: string, t) => {
  switch (gender) {
    case 'male':
      return t('male', 'Male');
    case 'female':
      return t('female', 'Female');
    case 'other':
      return t('other', 'Other');
    case 'unknown':
      return t('unknown', 'Unknown');
    default:
      return gender;
  }
};

/**
 * Extracts and returns the substring after the first colon (:) in the input string.
 * If there's no colon or the input is invalid, returns the original string.
 * The input string is typically in the format "uuid:string".
 *
 * @param {string} input - The input string from which the substring is to be extracted.
 * @returns {string} The substring found after the first colon, or the original string if no colon is present.
 */
export function extractString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const parts = input.split(':');
  return parts.length > 1 ? parts[1] : input;
}

// cleans the provider display name
export function extractNameString(formattedString: string) {
  if (!formattedString) {
    return '';
  }
  const parts = formattedString.split(' - ');
  return parts.length > 1 ? parts[1] : '';
}

export function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD');
}

export const formatAmount = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
};

/**
 * Extracts meaningful error message from various error formats
 * Handles: thrown Error objects, OpenMRS responseBody errors, and parsed JSON responses
 */
export const extractSavannahErrorMessage = (err: any): string => {
  if (!err) {
    return 'Unknown error occurred';
  }

  // Prioritize structured API payloads before generic fetch error messages.
  const extractFromPayload = (payload: any): string | null => {
    if (!payload) {
      return null;
    }

    const upstreamMessage = payload?.upstream_error?.message?.trim();
    if (upstreamMessage) {
      return upstreamMessage;
    }

    const upstreamError = payload?.upstream_error?.error?.trim();
    if (upstreamError && upstreamError.toLowerCase() !== 'bad request') {
      return upstreamError;
    }

    const topMessage = payload?.message?.trim();
    if (topMessage) {
      return topMessage;
    }

    const topError = payload?.error?.trim();
    if (topError) {
      return topError;
    }

    return null;
  };

  if (err?.responseBody) {
    try {
      const responseBody = typeof err.responseBody === 'string' ? JSON.parse(err.responseBody) : err.responseBody;
      const fromResponse = extractFromPayload(responseBody);
      if (fromResponse) {
        return fromResponse;
      }
    } catch {
      // Ignore parse failure and continue with other fallbacks.
    }
  }

  if (err?.data) {
    const fromData = extractFromPayload(err.data);
    if (fromData) {
      return fromData;
    }
  }

  // Some callers throw Error(JSON.stringify(payload)).
  if (err?.message && typeof err.message === 'string') {
    try {
      const parsed = JSON.parse(err.message);
      const fromParsedMessage = extractFromPayload(parsed);
      if (fromParsedMessage) {
        return fromParsedMessage;
      }
    } catch {
      // message is plain text, fall back below
    }

    return err.message;
  }

  const fromObject = extractFromPayload(err);
  if (fromObject) {
    return fromObject;
  }

  return 'Unknown error occurred';
};
