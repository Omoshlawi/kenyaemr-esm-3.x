import { type Order, type OrderAction, type OrderBasketItem } from '@openmrs/esm-patient-common-lib';
import { type ObservationValue } from '../../types/encounter';

/**
 * Enables a comparison of arbitrary values with support for undefined/null.
 * Requires the `<` and `>` operators to return something reasonable for the provided values.
 */
export function compare<T>(x?: T, y?: T) {
  if (x == undefined && y == undefined) {
    return 0;
  } else if (x == undefined) {
    return -1;
  } else if (y == undefined) {
    return 1;
  } else if (x < y) {
    return -1;
  } else if (x > y) {
    return 1;
  } else {
    return 0;
  }
}

/**
 * Builds medication order object from the given order object
 */
export function buildMedicationOrder(order: Order, action?: OrderAction) {
  return {
    display: order.drug?.display,
    previousOrder: action !== 'NEW' ? order.uuid : null,
    action: action,
    drug: order.drug,
    dosage: order.dose,
    unit: {
      value: order.doseUnits?.display,
      valueCoded: order.doseUnits?.uuid,
    },
    frequency: {
      valueCoded: order.frequency?.uuid,
      value: order.frequency?.display,
    },
    route: {
      valueCoded: order.route?.uuid,
      value: order.route?.display,
    },
    commonMedicationName: order.drug?.display,
    isFreeTextDosage: order.dosingType === 'org.openmrs.FreeTextDosingInstructions',
    freeTextDosage: order.dosingType === 'org.openmrs.FreeTextDosingInstructions' ? order.dosingInstructions : '',
    patientInstructions: order.dosingType !== 'org.openmrs.FreeTextDosingInstructions' ? order.dosingInstructions : '',
    asNeeded: order.asNeeded,
    asNeededCondition: order.asNeededCondition,
    startDate: action === 'DISCONTINUE' ? order.dateActivated : new Date(),
    duration: order.duration,
    durationUnit: {
      valueCoded: order.durationUnits?.uuid,
      value: order.durationUnits?.display,
    },
    pillsDispensed: order.quantity,
    numRefills: order.numRefills,
    indication: order.orderReasonNonCoded,
    orderer: order.orderer.uuid,
    careSetting: order.careSetting.uuid,
    quantityUnits: {
      value: order.quantityUnits?.display,
      valueCoded: order.quantityUnits?.uuid,
    },
  };
}

/**
 * Builds lab order object from the given order object
 */
export function buildLabOrder(order: Order, action?: OrderAction) {
  return {
    action: action,
    display: order.display,
    previousOrder: action !== 'NEW' ? order.uuid : null,
    orderer: order.orderer.uuid,
    careSetting: order.careSetting.uuid,
    instructions: order.instructions,
    urgency: order.urgency,
    accessionNumber: order.accessionNumber,
    testType: {
      label: order.concept.display,
      conceptUuid: order.concept.uuid,
    },
    orderNumber: order.orderNumber,
    concept: order.concept,
    orderType: order.orderType.uuid,
    specimenSource: null,
    scheduledDate: order.scheduledDate ? new Date(order.scheduledDate) : null,
  };
}

/**
 * Builds general order object from the given order object
 */
export function buildGeneralOrder(order: Order, action?: OrderAction): OrderBasketItem {
  return {
    action: action,
    display: order.display,
    previousOrder: action !== 'NEW' ? order.uuid : null,
    instructions: order.instructions,
    urgency: order.urgency,
    accessionNumber: order.accessionNumber,
    concept: order.concept,
    orderNumber: order.orderNumber,
    orderType: order.orderType.uuid,
    scheduledDate: order.scheduledDate ? new Date(order.scheduledDate) : null,
    visit: order.encounter.visit,
  };
}

/**
 * Utility function to extract display value from ObservationValue
 */
export const getObservationDisplayValue = (value: ObservationValue): string => {
  if (!value) {
    return '--';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (value && typeof value === 'object' && 'display' in value) {
    return value.display;
  }
  return '--';
};

/**
 * Removes the '+' prefix from a phone number if present
 * @param phoneNumber - The phone number to sanitize
 * @returns The phone number without the '+' prefix
 */
export function sanitizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) {
    return phoneNumber;
  }
  return phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;
}

/**
 * Masks a phone number by replacing all digits except the first two and the last two with asterisks (*)
 * @example
 * maskPhoneNumber('254712345678') // returns '25471******78'
 * @param phoneNumber - The phone number to be masked
 * @returns The masked phone number
 */
export const maskPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) {
    return '';
  }
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length < 8) {
    return phoneNumber;
  }
  const firstPart = digits.slice(0, -6);
  const maskedPart = '*'.repeat(4);
  const lastPart = digits.slice(-2);
  return `${firstPart}${maskedPart}${lastPart}`;
};

/**
 * Extracts the most meaningful error message from a Savannah IL / SHA upstream error response.
 *
 * Savannah errors come in several shapes:
 *   { success: false, error: "...", upstream_error: { error: "Bad Request", message: "specific reason" } }
 *   { success: false, error: "..." }
 *   { error: "...", message: "..." }
 *   "plain string"
 */

export interface UpstreamErrorBody {
  error?: string;
  message?: string;
}

export interface SavannahErrorResponse {
  success?: boolean;
  error?: string;
  upstream_error?: UpstreamErrorBody;
  message?: string;
}

/**
 * Returns the most specific human-readable error message available.
 * Priority: upstream_error.message > upstream_error.error > message > error > fallback
 */
export function extractUpstreamError(
  response: SavannahErrorResponse | string | unknown,
  fallback = 'An unexpected error occurred. Please try again.',
): string {
  if (!response) {
    return fallback;
  }

  if (typeof response === 'string') {
    return response || fallback;
  }

  const res = response as SavannahErrorResponse;

  const upstreamMsg = res.upstream_error?.message?.trim();
  if (upstreamMsg) {
    return upstreamMsg;
  }

  const upstreamErr = res.upstream_error?.error?.trim();
  if (upstreamErr && upstreamErr.toLowerCase() !== 'bad request') {
    return upstreamErr;
  }

  const topMsg = res.message?.trim();
  if (topMsg) {
    return topMsg;
  }

  const topError = res.error?.trim();
  if (topError && !res.upstream_error) {
    return topError;
  }

  if (topError) {
    return topError;
  }

  return fallback;
}

/**
 * Extracts error from a caught Error/unknown in catch blocks.
 * Handles: openmrsFetch errors (with .responseBody), Error objects, raw response objects.
 *
 * IMPORTANT: openmrsFetch errors are Error instances AND carry a .responseBody field.
 * We must check responseBody FIRST, otherwise we'd fall into the Error branch and surface
 * the raw "Server responded with 400..." technical message instead of the upstream message.
 */
export function extractFetchError(err: unknown, fallback = 'An unexpected error occurred. Please try again.'): string {
  if (!err) {
    return fallback;
  }

  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;

    if (e.responseBody) {
      return extractUpstreamError(e.responseBody as SavannahErrorResponse, fallback);
    }

    if (e.data) {
      return extractUpstreamError(e.data as SavannahErrorResponse, fallback);
    }
  }

  if (err instanceof Error) {
    const msg = err.message;
    if (msg) {
      try {
        const parsed = JSON.parse(msg);
        return extractUpstreamError(parsed, msg);
      } catch {
        return msg;
      }
    }
    return fallback;
  }

  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    if ('upstream_error' in e || 'error' in e || 'message' in e) {
      return extractUpstreamError(e as SavannahErrorResponse, fallback);
    }
  }

  return fallback;
}

export function getPatientPrintFields(patient?: fhir.Patient) {
  const name =
    patient?.name?.[0]?.text ??
    [patient?.name?.[0]?.given?.join(' '), patient?.name?.[0]?.family].filter(Boolean).join(' ');
  const id = patient?.identifier?.[0]?.value;
  const age = patient?.birthDate
    ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / 3.15576e10)
    : undefined;
  return {
    patientName: name || undefined,
    patientId: id,
    patientAge: age,
  };
}

export const documentId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `PM-${timestamp}-${random}`.toUpperCase();
};
