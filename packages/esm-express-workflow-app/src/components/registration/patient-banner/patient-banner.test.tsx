import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getEligibilityTags } from '../helper';
import { EnhancedPatientBannerPatientInfo } from './patient-banner.component';

vi.mock('@openmrs/esm-framework', () => ({
  age: vi.fn(() => '34 years'),
  formatDate: vi.fn(() => '15 Jul 1992'),
  getPatientName: vi.fn(() => 'Jane Wanjiku Doe'),
  parseDate: vi.fn((date: string) => new Date(date)),
  ExtensionSlot: () => null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

vi.mock('../helper', () => ({
  getEligibilityTags: vi.fn(),
  maskName: vi.fn(() => 'J*** W****** D**'),
}));

const mockGetEligibilityTags = vi.mocked(getEligibilityTags);

describe('EnhancedPatientBannerPatientInfo', () => {
  const patient: fhir.Patient = {
    resourceType: 'Patient',
    id: 'patient-uuid',
    gender: 'female',
    birthDate: '1992-07-15',
    name: [{ given: ['Jane', 'Wanjiku'], family: 'Doe' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEligibilityTags.mockReturnValue([]);
  });

  test('protects an unverified patient identity while showing identifying demographics', () => {
    render(<EnhancedPatientBannerPatientInfo patient={patient} crNumber="CR-1234" />);

    expect(screen.getByText('J*** W****** D**')).toBeInTheDocument();
    expect(screen.queryByText('Jane Wanjiku Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('34 years')).toBeInTheDocument();
    expect(screen.getByText('15 Jul 1992')).toBeInTheDocument();
    expect(screen.getByText('CR Number: CR-1234')).toBeInTheDocument();
  });

  test('reveals the patient identity after verification', () => {
    render(<EnhancedPatientBannerPatientInfo patient={patient} isVerified />);

    expect(screen.getByText('Jane Wanjiku Doe')).toBeInTheDocument();
    expect(screen.queryByText('J*** W****** D**')).not.toBeInTheDocument();
    expect(screen.getByText('CR Number: --')).toBeInTheDocument();
  });

  test('tells the user when the eligibility check is in progress', () => {
    render(<EnhancedPatientBannerPatientInfo patient={patient} eligibilityData={{} as never} isEligibilityLoading />);

    expect(screen.getByText('Checking eligibility...')).toBeInTheDocument();
    expect(screen.queryByText('SHIF | Eligible')).not.toBeInTheDocument();
  });

  test('shows the patient eligibility results after the check completes', () => {
    const eligibilityData = {} as never;
    mockGetEligibilityTags.mockReturnValue([
      { text: 'SHIF | Eligible', type: 'green' },
      { text: 'UHC | Not Eligible', type: 'red' },
    ]);

    render(<EnhancedPatientBannerPatientInfo patient={patient} eligibilityData={eligibilityData} />);

    expect(screen.getByText('SHIF | Eligible')).toBeInTheDocument();
    expect(screen.getByText('UHC | Not Eligible')).toBeInTheDocument();
    expect(screen.queryByText('Checking eligibility...')).not.toBeInTheDocument();
  });
});
