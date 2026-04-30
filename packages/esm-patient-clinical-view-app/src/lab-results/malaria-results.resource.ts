import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { OrderPost, type Order } from '@openmrs/esm-patient-common-lib';

export interface MalariaObsPayload {
  concept: { uuid: string };
  value: { uuid: string } | number;
  status: string;
  order: { uuid: string };
}

export function useMalariaResultsInvalidation(order: Order) {
  // Using mutate here does not work because the order is not in the cache
  const mutateLabOrder = () => globalThis.location.reload();

  return { mutateLabOrder };
}

export async function saveMalariaLabResults(
  order: Order,
  obs: Array<MalariaObsPayload>,
  abortController: AbortController,
): Promise<void> {
  const encounterResponse = await openmrsFetch(`${restBaseUrl}/encounter/${order.encounter.uuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: JSON.stringify({ obs }),
  });

  if (!encounterResponse.ok) {
    throw new Error('Failed to save observations');
  }

  const discontinuationPayload = {
    previousOrder: order.uuid,
    type: 'testorder',
    action: 'DISCONTINUE',
    careSetting: order.careSetting.uuid,
    encounter: order.encounter.uuid,
    patient: order.patient.uuid,
    concept: order.concept.uuid,
    orderer: order.orderer,
  };

  const orderResponse = await openmrsFetch(`${restBaseUrl}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: JSON.stringify(discontinuationPayload),
  });

  if (orderResponse.status !== 201) {
    throw new Error('Failed to update order');
  }

  await openmrsFetch(`${restBaseUrl}/order/${order.uuid}/fulfillerdetails/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: JSON.stringify({ fulfillerStatus: 'COMPLETED', fulfillerComment: 'Test Results Entered' }),
  });
}

type RestFieldErrorItem = { code?: string; message?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getInvalidSubmissionSlice(body: unknown): {
  message?: string;
  fieldErrors?: Record<string, RestFieldErrorItem[]>;
  globalErrors?: RestFieldErrorItem[];
} | null {
  if (!isRecord(body)) {
    return null;
  }
  const inner = isRecord(body.error) ? body.error : body;
  const fieldErrors = inner.fieldErrors;
  const globalErrors = inner.globalErrors;
  const message = typeof inner.message === 'string' ? inner.message : undefined;

  const hasFieldErrors = isRecord(fieldErrors) && Object.keys(fieldErrors).length > 0;
  const hasGlobalErrors = Array.isArray(globalErrors) && globalErrors.length > 0;
  const hasMessage = Boolean(message);

  if (!hasFieldErrors && !hasGlobalErrors && !hasMessage) {
    return null;
  }

  return {
    message,
    fieldErrors: hasFieldErrors ? (fieldErrors as Record<string, RestFieldErrorItem[]>) : undefined,
    globalErrors: hasGlobalErrors ? (globalErrors as RestFieldErrorItem[]) : undefined,
  };
}

function joinFieldErrorMessages(fieldErrors: Record<string, RestFieldErrorItem[]>): string {
  return Object.values(fieldErrors)
    .flat()
    .map((e) => (typeof e?.message === 'string' ? e.message : ''))
    .filter(Boolean)
    .join(' ');
}

function messageFromInvalidSubmissionSlice(
  slice: NonNullable<ReturnType<typeof getInvalidSubmissionSlice>>,
): string | undefined {
  if (slice.fieldErrors && Object.keys(slice.fieldErrors).length > 0) {
    const fromFields = joinFieldErrorMessages(slice.fieldErrors);
    if (fromFields) {
      return fromFields;
    }
  }
  const fromGlobal = slice.globalErrors
    ?.map((g) => (typeof g?.message === 'string' ? g.message : ''))
    .filter(Boolean)
    .join(' ');
  if (fromGlobal) {
    return fromGlobal;
  }
  return slice.message;
}

function getErrorResponseData(error: Record<string, unknown>): unknown {
  if (error.responseBody !== undefined) {
    return error.responseBody;
  }
  const response = error.response;
  if (isRecord(response) && isRecord(response.data)) {
    return response.data;
  }
  return undefined;
}

/**
 * Builds a user-facing message from OpenMRS REST error bodies, including invalid submission payloads
 * with top-level or nested `fieldErrors` / `globalErrors`.
 */
export function getOpenmrsRestErrorMessage(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const responseData = getErrorResponseData(error);
  const slice = getInvalidSubmissionSlice(responseData);
  if (slice) {
    const fromSlice = messageFromInvalidSubmissionSlice(slice);
    if (fromSlice) {
      return fromSlice;
    }
  }

  if (isRecord(responseData) && isRecord(responseData.error) && typeof responseData.error.message === 'string') {
    return responseData.error.message;
  }

  return typeof error.message === 'string' && error.message ? error.message : undefined;
}

export const createMalariaRapidTest = async (order: Order) => {
  const payload = {
    type: 'testorder',
    action: 'new',
    urgency: 'ROUTINE',
    dateActivated: new Date().toISOString(),
    careSetting: order.careSetting.uuid,
    encounter: order.encounter.uuid,
    patient: order.patient.uuid,
    concept: order.concept.uuid,
    orderer: order.orderer,
  };
  return openmrsFetch(`${restBaseUrl}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const updateMalariaRapidTestToInProgress = async (order: Order) => {
  const payload = {
    fulfillerStatus: 'IN_PROGRESS',
  };
  return openmrsFetch(`${restBaseUrl}/order/${order.uuid}/fulfillerdetails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};
