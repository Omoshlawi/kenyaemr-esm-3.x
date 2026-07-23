import type { FieldDef, NumericFieldDef, TextFieldDef } from '../constants/field-definitions';

const BP_SINGLE = /^\d{1,3}$/;
const BP_PAIR = /^\d{1,3}\/\d{1,3}$/;

export const isBloodPressureValue = (value: string): boolean =>
  BP_SINGLE.test(value.trim()) || BP_PAIR.test(value.trim());

export const parseNumericFieldValue = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const validateNumericField = (def: NumericFieldDef, value?: string): string | null => {
  if (!value?.trim()) {
    return def.required ? `${def.label} is required` : null;
  }
  const numeric = parseNumericFieldValue(value);
  if (numeric == null) {
    return `${def.label} must be a number`;
  }
  if (def.min != null && numeric < def.min) {
    return `${def.label} must be at least ${def.min}`;
  }
  if (def.max != null && numeric > def.max) {
    return `${def.label} must be at most ${def.max}`;
  }
  return null;
};

export const validateTextField = (def: TextFieldDef, value?: string): string | null => {
  if (!value?.trim()) {
    return def.required ? `${def.label} is required` : null;
  }
  const trimmed = value.trim();
  if (def.pattern === 'bloodPressure' && !isBloodPressureValue(trimmed)) {
    return `${def.label} must be a number or systolic/diastolic (e.g. 120/80)`;
  }
  if (def.minLength != null && trimmed.length < def.minLength) {
    return `${def.label} is too short`;
  }
  if (def.maxLength != null && trimmed.length > def.maxLength) {
    return `${def.label} is too long`;
  }
  return null;
};

export const validateCodedField = (
  def: Extract<FieldDef, { kind: 'coded' }>,
  value?: string | string[],
): string | null => {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  if (def.required && selected.length === 0) {
    return `${def.label} is required`;
  }
  return null;
};

export const validateFieldDef = (def: FieldDef, value?: string | string[]): string | null => {
  switch (def.kind) {
    case 'numeric':
      return validateNumericField(def, typeof value === 'string' ? value : undefined);
    case 'text':
      return validateTextField(def, typeof value === 'string' ? value : undefined);
    case 'coded':
      return validateCodedField(def, value);
    default:
      return null;
  }
};

/** Restrict keystrokes/paste for numeric fields — returns sanitized string or null to reject. */
export const sanitizeNumericInput = (raw: string, allowDecimal = true): string => {
  const pattern = allowDecimal ? /[^\d.]/g : /\D/g;
  let next = raw.replace(pattern, '');
  if (allowDecimal) {
    const parts = next.split('.');
    if (parts.length > 2) {
      next = `${parts[0]}.${parts.slice(1).join('')}`;
    }
  }
  return next;
};

/** Restrict BP text input to digits and at most one slash. */
export const sanitizeBloodPressureInput = (raw: string): string => {
  let next = raw.replace(/[^\d/]/g, '');
  const slashIndex = next.indexOf('/');
  if (slashIndex >= 0) {
    next = next.slice(0, slashIndex + 1) + next.slice(slashIndex + 1).replace(/\//g, '');
  }
  return next;
};
