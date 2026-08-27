import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DependantRow from './dependant-row.component';
import { useLinkedPatientForParticipant } from '../resources/link-participant.resource';
import { type PcsParticipant } from '../pcs.types';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  age: () => '14 yrs',
  useConfig: () => ({
    pcsIdentifiers: { studyParticipantID: 'study-id-type', studyTemporaryParticipantID: 'temp-id-type' },
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

vi.mock('../resources/link-participant.resource', () => ({ useLinkedPatientForParticipant: vi.fn() }));

vi.mock('../resources/pcs.resource', () => ({ formatParticipantName: () => 'DENNIS OMONDI ODONGO' }));

const mockUseLinkedPatientForParticipant = vi.mocked(useLinkedPatientForParticipant);

const dependant = {
  individualId: '901-1-1-3',
  firstName: 'DENNIS',
  middleName: 'OMONDI',
  lastName: 'ODONGO',
  sex: 'M',
  dateOfBirth: '2011-06-12',
  pbidsEnrolled: true,
  cardse: false,
  mother: null,
  compound: { compoundId: '901-1', headIndividualId: '901-1-1-1', headFirstName: 'JOHN', headLastName: 'ODONGO' },
  village: { code: '901', name: 'TEST ABUYA' },
  contacts: [],
  matchedOn: null,
  matchType: null,
} as PcsParticipant;

beforeEach(() => vi.clearAllMocks());

describe('DependantRow', () => {
  it('reports the patient a dependant is already linked to', () => {
    mockUseLinkedPatientForParticipant.mockReturnValue({
      linkedPatient: { uuid: 'p1', person: { personName: { display: 'Dennis Odongo' } } },
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    } as any);

    render(<DependantRow dependant={dependant} />);

    expect(screen.getByText('Linked')).toBeInTheDocument();
    expect(screen.getByText('Dennis Odongo')).toBeInTheDocument();
    // A linked row offers the undo, not the link.
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create & link' })).not.toBeInTheDocument();
  });

  it('offers to create a dependant nobody is linked to', () => {
    mockUseLinkedPatientForParticipant.mockReturnValue({
      linkedPatient: null,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    } as any);

    render(<DependantRow dependant={dependant} />);

    expect(screen.getByRole('button', { name: 'Create & link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlink' })).not.toBeInTheDocument();
    expect(screen.queryByText('Linked')).not.toBeInTheDocument();
  });

  it('shows neither while the lookup is still in flight', () => {
    mockUseLinkedPatientForParticipant.mockReturnValue({
      linkedPatient: null,
      isLoading: true,
      error: undefined,
      mutate: vi.fn(),
    } as any);

    render(<DependantRow dependant={dependant} />);

    // Flashing the action before the answer arrives invites a misclick on a child who is
    // already registered.
    expect(screen.queryByRole('button', { name: 'Create & link' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unlink' })).not.toBeInTheDocument();
    expect(screen.queryByText('Linked')).not.toBeInTheDocument();
  });
});
