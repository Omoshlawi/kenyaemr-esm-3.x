import { getConceptObsValueKind } from '../constants/concept-obs-kinds';
import { getConceptServerRange } from '../constants/concept-server-ranges';
import type { HaemodialysisObsGroupMember, HaemodialysisObsInput } from './encounter-mapper';
import { isValidOpenmrsUuid } from './openmrs-uuid';

const isCodedObsValue = (value: unknown): value is { uuid: string } =>
  typeof value === 'object' &&
  value !== null &&
  'uuid' in value &&
  typeof (value as { uuid: unknown }).uuid === 'string' &&
  isValidOpenmrsUuid((value as { uuid: string }).uuid);

const isCodedPayloadValue = (value: unknown): boolean =>
  isCodedObsValue(value) || (typeof value === 'string' && isValidOpenmrsUuid(value));

const validateObsMember = (item: HaemodialysisObsGroupMember | HaemodialysisObsInput): string | null => {
  const kind = getConceptObsValueKind(item.concept);
  if (!kind) {
    return null;
  }

  if (kind === 'numeric' && typeof item.value !== 'number') {
    return `Observation ${item.concept} expects a numeric value but received ${JSON.stringify(item.value)}`;
  }

  if (kind === 'text' && typeof item.value !== 'string') {
    return `Observation ${item.concept} expects a text value but received ${JSON.stringify(item.value)}`;
  }

  if (kind === 'coded' && !isCodedPayloadValue(item.value)) {
    return `Observation ${item.concept} expects a coded value (uuid string or { uuid }) but received ${JSON.stringify(
      item.value,
    )}`;
  }

  if (typeof item.value === 'number') {
    const range = getConceptServerRange(item.concept);
    if (range && (item.value < range.min || item.value > range.max)) {
      const units = range.units ? ` ${range.units}` : '';
      return `${range.label} must be between ${range.min} and ${range.max}${units}. OpenMRS rejected ${item.value}.`;
    }
  }

  return null;
};

/**
 * Client-side guard: ensure each obs value matches the datatype implied by the form metadata.
 * Returns a human-readable error naming the first mismatch.
 */
export const validateObsPayload = (obs: HaemodialysisObsInput[]): string | null => {
  for (const item of obs) {
    if (item.groupMembers?.length) {
      for (const member of item.groupMembers) {
        const groupError = validateObsMember(member);
        if (groupError) {
          return groupError;
        }
      }
      continue;
    }

    const error = validateObsMember(item);
    if (error) {
      return error;
    }
  }

  return null;
};

const describeObsValue = (value: HaemodialysisObsInput['value']): string => {
  if (isCodedObsValue(value)) {
    return `coded:${value.uuid}`;
  }
  if (typeof value === 'string' && isValidOpenmrsUuid(value)) {
    return `coded:${value}`;
  }
  return typeof value;
};

export const formatObsConceptList = (obs: HaemodialysisObsInput[]): string =>
  obs
    .map((item) => {
      if (item.groupMembers?.length) {
        return `${item.concept} (group:${item.groupMembers.length})`;
      }
      return `${item.concept} (${describeObsValue(item.value)})`;
    })
    .join(', ');
