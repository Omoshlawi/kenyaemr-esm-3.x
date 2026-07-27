import React from 'react';
import { screen, render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi, type MockedFunction } from 'vitest';
import PatientFlags from './patient-flags.component';
import { usePatientFlags } from '../hooks/usePatientFlags';

const mockUsePatientFlags = usePatientFlags as MockedFunction<typeof usePatientFlags>;

vi.mock('../hooks/usePatientFlags', () => {
  return { usePatientFlags: vi.fn() };
});

describe('<PatientFlags/>', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('should display patient flags', () => {
    mockUsePatientFlags.mockReturnValue({ isLoading: false, patientFlags: ['hiv', 'cancer'], error: undefined });
    render(<PatientFlags patientUuid="some-patient-uuid" />);
    expect(screen.getByText(/^hiv$/i)).toBeInTheDocument();
    expect(screen.getByText(/^cancer$/i)).toBeInTheDocument();
  });

  test("should display error message when there's an error", () => {
    mockUsePatientFlags.mockReturnValue({ isLoading: false, patientFlags: [], error: new Error('some-error') });
    render(<PatientFlags patientUuid="some-patient-uuid" />);
    expect(screen.getByText(/Error loading patient flags/i)).toBeInTheDocument();
  });
});
