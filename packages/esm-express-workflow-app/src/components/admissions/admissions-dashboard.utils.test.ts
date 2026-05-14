import { describe, expect, it, vi } from 'vitest';

vi.mock('@openmrs/esm-framework', () => ({
  formatDate: vi.fn((date: Date) => date.toISOString().slice(0, 10)),
  parseDate: vi.fn((value: string) => new Date(value)),
}));

const { formatAdministrationInstructions, getDrugDisplay } = await import('./admissions-dashboard.utils');

describe('admissions-dashboard utils', () => {
  it('formats administration instructions with translated entries', () => {
    const order = {
      quantity: 500,
      quantityUnits: { display: 'ml' },
      frequency: { display: 'OD' },
      dose: 20,
      doseUnits: { display: 'drops/min' },
      duration: 2,
      durationUnits: { display: 'days' },
    } as any;

    const translated = formatAdministrationInstructions(order, (key, defaultValue, options) => {
      const dictionary = {
        administrationVolumeValue: 'Vol: {{value}}',
        administrationFrequencyValue: 'Freq: {{value}}',
        administrationRateValue: 'Ritmo: {{value}}',
        administrationDurationValue: 'Duree: {{value}}',
      };

      const template = dictionary[key as keyof typeof dictionary] ?? defaultValue;
      return template.replace('{{value}}', String(options?.value ?? '--'));
    });

    expect(translated).toContain('Vol: 500 ml');
    expect(translated).toContain('Freq: OD');
    expect(translated).toContain('Ritmo: 20 drops/min');
    expect(translated).toContain('Duree: 2 days');
  });

  it('falls back to non-coded drug name when drug display is missing', () => {
    const order = {
      drug: undefined,
      drugNonCoded: 'Custom compounded mix',
    } as any;

    expect(getDrugDisplay(order)).toBe('Custom compounded mix');
  });
});
