import { describe, expect, it } from 'vitest';
import { buildAddDependantSchema } from './add-dependant.workspace';

const schema = buildAddDependantSchema((_key: string, fallback: string) => fallback);

const valid = {
  givenName: 'Baby',
  middleName: '',
  familyName: 'Odongo',
  dateOfBirth: new Date(),
  sex: 'F' as const,
};

const monthsAgo = (months: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
};

const errorFor = (field: string, input: Record<string, unknown>) => {
  const result = schema.safeParse(input);
  return result.success ? undefined : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe('add dependant schema', () => {
  it('accepts an infant born within the last year', () => {
    expect(schema.safeParse({ ...valid, dateOfBirth: monthsAgo(6) }).success).toBe(true);
  });

  it('rejects a child older than one year', () => {
    // The module mints these participants for infants only, so this is a real rule rather
    // than a formatting nicety — it is the one most easily dropped in a later edit.
    expect(errorFor('dateOfBirth', { ...valid, dateOfBirth: monthsAgo(13) })).toBe(
      'This form is for infants — age cannot exceed one year',
    );
  });

  it('rejects a date of birth in the future', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    expect(errorFor('dateOfBirth', { ...valid, dateOfBirth: tomorrow })).toBe('Date of birth cannot be in the future');
  });

  it('requires both name parts, but not the middle name', () => {
    expect(errorFor('givenName', { ...valid, givenName: '   ' })).toBe('Given name is required');
    expect(errorFor('familyName', { ...valid, familyName: '' })).toBe('Family name is required');
    expect(schema.safeParse({ ...valid, middleName: undefined }).success).toBe(true);
  });

  it('requires a sex', () => {
    expect(errorFor('sex', { ...valid, sex: undefined })).toBe('Sex is required');
  });
});
