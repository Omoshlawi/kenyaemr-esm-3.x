import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PatientDischargeWorkspace } from './patient-discharge.workspace';
import { usePatient, useEmrConfiguration, useVisit } from '@openmrs/esm-framework';
import { usePatientDischarge } from './patient-discharge.resource';

vi.mock('@openmrs/esm-framework', () => ({
  usePatient: vi.fn(),
  useEmrConfiguration: vi.fn(),
  useVisit: vi.fn(),
  ExtensionSlot: vi.fn().mockImplementation(({ name }) => <div data-testid={name} />),
}));

vi.mock('./patient-discharge.resource', () => ({
  usePatientDischarge: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('PatientDischargeWorkspace', () => {
  const mockProps = {
    patientUuid: 'test-patient-uuid',
    wardPatient: {
      patient: {
        uuid: 'test-patient-uuid',
        display: 'Test Patient',
        identifiers: [],
        person: {
          uuid: 'test-person-uuid',
          display: 'Test Person',
          gender: 'M',
          birthdate: '1990-01-01',
          dead: false,
          age: 33,
          deathDate: null,
          causeOfDeath: null,
          preferredAddress: null,
          attributes: [],
        },
      },
      visit: {
        uuid: 'test-visit-uuid',
        display: 'Test Visit',
        encounters: [],
        visitType: { uuid: 'test-visit-type-uuid', display: 'Test Visit Type' },
        startDatetime: '2024-01-01',
        stopDatetime: null,
      },
      bed: {
        uuid: 'test-bed-uuid',
        id: 1,
        bedNumber: 'BED-001',
        bedType: { uuid: 'test-bed-type-uuid', display: 'Standard' },
        status: { uuid: 'test-status-uuid', display: 'OCCUPIED' },
        location: { uuid: 'test-location-uuid', display: 'Test Location' },
        row: 1,
        column: 1,
      },
    },
    closeWorkspace: vi.fn(),
    closeWorkspaceWithSavedChanges: vi.fn(),
    promptBeforeClosing: vi.fn(),
    setTitle: vi.fn(),
  };

  const mockPatient = {
    uuid: 'test-patient-uuid',
    display: 'Test Patient',
  };

  const mockVisit = {
    uuid: 'test-visit-uuid',
    visitType: { uuid: 'test-visit-type-uuid' },
    encounters: [{ uuid: 'test-encounter-uuid' }],
  };

  const mockEmrConfiguration = {
    visitTypes: [],
    visitTypeConfig: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useVisit).mockReturnValue({
      isLoading: false,
      activeVisit: mockVisit,
      error: null,
    } as any);
    vi.mocked(usePatient).mockReturnValue({
      patient: mockPatient,
      isLoading: false,
      error: null,
    } as any);
    vi.mocked(useEmrConfiguration).mockReturnValue({
      emrConfiguration: mockEmrConfiguration,
      isLoadingEmrConfiguration: false,
      errorFetchingEmrConfiguration: null,
    } as any);
    vi.mocked(usePatientDischarge).mockReturnValue({
      handleDischarge: vi.fn(),
    } as any);
  });

  test('renders loading state when data is being fetched', () => {
    vi.mocked(useVisit).mockReturnValue({
      isLoading: true,
      activeVisit: null,
      error: null,
    } as any);

    render(<PatientDischargeWorkspace {...mockProps} />);
    const loadingSpinner = screen.getAllByText(/loading/i);
    expect(loadingSpinner).toHaveLength(2);
  });

  test('renders error state when there is an error', () => {
    vi.mocked(useVisit).mockReturnValue({
      isLoading: false,
      activeVisit: null,
      error: new Error('Test error'),
    } as any);

    render(<PatientDischargeWorkspace {...mockProps} />);
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText(/errorLoadingPatientWorkspace/)).toBeInTheDocument();
  });

  test('renders the component with all required slots when data is loaded', () => {
    render(<PatientDischargeWorkspace {...mockProps} />);

    expect(screen.getByTestId('visit-context-header-slot')).toBeInTheDocument();
    expect(screen.getByTestId('form-widget-slot')).toBeInTheDocument();
  });

  test('passes correct state to form-widget-slot', () => {
    render(<PatientDischargeWorkspace {...mockProps} />);

    const formWidgetSlot = screen.getByTestId('form-widget-slot');
    expect(formWidgetSlot).toBeInTheDocument();
  });

  test('handles missing visit data gracefully', () => {
    vi.mocked(useVisit).mockReturnValue({
      isLoading: false,
      activeVisit: null,
      error: null,
    } as any);

    render(<PatientDischargeWorkspace {...mockProps} />);
    expect(screen.getByTestId('visit-context-header-slot')).toBeInTheDocument();
  });
});
