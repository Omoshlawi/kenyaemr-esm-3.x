import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAssignedExtensions } from '@openmrs/esm-framework';
import SearchBar, { REGISTRATION_PATIENT_EXTRAS_SLOT } from './search-bar.component';
import { searchPatientFromHIE, usePatient, useSHAEligibility } from './search-bar.resource';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  useAssignedExtensions: vi.fn(),
  ExtensionSlot: ({ name }: { name: string }) => <div data-testid={`slot-${name}`} />,
  useConfig: () => ({
    identifierTypes: [{ identifierType: 'National ID', identifierValue: 'national-id' }],
    otpExpirationDurationInminutes: 5,
    nationalIdUUID: 'national-id-type',
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

vi.mock('./search-bar.resource', () => ({
  searchPatientFromHIE: vi.fn(),
  usePatient: vi.fn(),
  useSHAEligibility: vi.fn(),
}));

// Stubbed so the props the cards are handed can be read directly — the gate is a prop, not pixels.
const localCardProps = vi.fn();
vi.mock('../card/Local-card/local-card.component', () => ({
  default: (props: any) => {
    localCardProps(props);
    return <div data-testid="local-card" />;
  },
}));
vi.mock('../card/HIE-card/hie-card.component', () => ({ default: () => <div data-testid="hie-card" /> }));

const mockUseAssignedExtensions = vi.mocked(useAssignedExtensions);

const localPatient = { uuid: 'patient-uuid', display: 'Jane Odongo', identifiers: [], person: { gender: 'F' } };

const searchForAPatient = async () => {
  await userEvent.type(screen.getByRole('searchbox'), '12345678');
  await userEvent.click(screen.getByRole('button', { name: 'Search for Patient(s)' }));
  await waitFor(() => expect(screen.getByTestId('local-card')).toBeInTheDocument());
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePatient).mockReturnValue({ patient: [localPatient], isLoading: false } as any);
  vi.mocked(useSHAEligibility).mockReturnValue({ data: null, isLoading: false } as any);
  vi.mocked(searchPatientFromHIE).mockResolvedValue(null as any);
});

describe('registration patient-extras slot', () => {
  it('leaves the cards unselectable when nothing is registered against the slot', async () => {
    mockUseAssignedExtensions.mockReturnValue([]);

    render(<SearchBar />);
    await searchForAPatient();

    // Withholding the callback is the whole gate: the cards derive `isSelectable` from it, so
    // with no consumer the screen behaves exactly as it did before it became extensible.
    expect(localCardProps.mock.calls.at(-1)![0].onSelectPatient).toBeUndefined();
    expect(screen.queryByTestId(`slot-${REGISTRATION_PATIENT_EXTRAS_SLOT}`)).not.toBeInTheDocument();
  });

  it('makes the cards selectable once an extension is assigned', async () => {
    mockUseAssignedExtensions.mockReturnValue([{ id: 'some-extension' }] as any);

    render(<SearchBar />);
    await searchForAPatient();

    expect(localCardProps.mock.calls.at(-1)![0].onSelectPatient).toBeInstanceOf(Function);
  });
});
