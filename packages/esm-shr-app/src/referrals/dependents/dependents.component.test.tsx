import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DependentsComponent from './dependents.component';
import useDependents, { createPatientAndLinkToPatientAsRelatedPerson } from './useDependents';

vi.mock('./useDependents', () => ({
  default: vi.fn(),
  createPatientAndLinkToPatientAsRelatedPerson: vi.fn(),
}));

const mockUseDependents = vi.mocked(useDependents);
const mockCreatePatient = vi.mocked(createPatientAndLinkToPatientAsRelatedPerson);
const patient = {
  resourceType: 'Patient',
  id: 'patient-1',
  identifier: [
    {
      value: '12345678',
      type: { coding: [{ code: '49af6cdc-7968-4abb-bf46-de10d7f4859f' }] },
    },
  ],
} as fhir.Patient;

describe('DependentsComponent', () => {
  it('shows an empty state when the patient has no dependents', () => {
    mockUseDependents.mockReturnValue({ dependents: [], isLoading: false, error: null });

    render(<DependentsComponent patient={patient} patientUuid="patient-1" />);

    expect(screen.getByText(/There are no .* to display for this patient/i)).toBeInTheDocument();
    expect(mockUseDependents).toHaveBeenCalledWith('12345678');
  });

  it('shows an error when dependents cannot be loaded', () => {
    mockUseDependents.mockReturnValue({
      dependents: [],
      isLoading: false,
      error: new Error('Dependents unavailable'),
    });

    render(<DependentsComponent patient={patient} patientUuid="patient-1" />);

    expect(screen.getByText('Error: Dependents unavailable')).toBeInTheDocument();
  });

  it('registers the dependent selected by the user', async () => {
    const user = userEvent.setup();
    const dependent = {
      name: 'john doe',
      relationship: 'child',
      phoneNumber: '0712345678',
      gender: 'male',
    } as never;
    mockUseDependents.mockReturnValue({ dependents: [dependent], isLoading: false, error: null });

    render(<DependentsComponent patient={patient} patientUuid="patient-1" />);

    expect(screen.getByText('John doe')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Register Dependent' }));

    expect(mockCreatePatient).toHaveBeenCalledWith('patient-1', dependent, expect.any(Function));
  });
});
