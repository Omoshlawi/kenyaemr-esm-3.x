import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtensionSlot, usePatient, useVisit } from '@openmrs/esm-framework';
import PatientAdrWorkspace from './patient-adr.workspace';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  usePatient: vi.fn(),
  useVisit: vi.fn(),
  Workspace2: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section aria-label={title}>{children}</section>
  ),
  ExtensionSlot: vi.fn(({ name }: { name: string }) => <div data-testid="extension-slot">{name}</div>),
}));

const mockUsePatient = vi.mocked(usePatient);
const mockUseVisit = vi.mocked(useVisit);
const mockExtensionSlot = vi.mocked(ExtensionSlot);

const encounter = {
  formUuid: 'form-uuid-001',
  encounterDatetime: '2026-07-30T08:45:00.000+03:00',
  encounterType: 'Adverse Drug Reaction',
  encounterUuid: 'encounter-uuid-001',
  visitUuid: 'visit-uuid-001',
  patientUuid: 'patient-uuid-001',
  visitTypeUuid: 'visit-type-uuid-001',
};

const mockPatient = { id: 'patient-uuid-001' } as fhir.Patient;

function renderWorkspace(overrides = {}) {
  const closeWorkspace = vi.fn();
  render(
    <PatientAdrWorkspace
      workspaceProps={{ encounter }}
      closeWorkspace={closeWorkspace}
      {...(overrides as Record<string, unknown>)}
    />,
  );
  return { closeWorkspace };
}

describe('PatientAdrWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePatient.mockReturnValue({ patient: mockPatient, isLoading: false, error: null } as ReturnType<
      typeof usePatient
    >);
    mockUseVisit.mockReturnValue({ isLoading: false, error: null } as ReturnType<typeof useVisit>);
  });

  it('shows a loading indicator while the visit is loading', () => {
    mockUseVisit.mockReturnValue({ isLoading: true, error: null } as ReturnType<typeof useVisit>);

    renderWorkspace();

    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.queryByTestId('extension-slot')).not.toBeInTheDocument();
  });

  it('shows a loading indicator while the patient is loading', () => {
    mockUsePatient.mockReturnValue({ patient: undefined, isLoading: true, error: null } as ReturnType<
      typeof usePatient
    >);

    renderWorkspace();

    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.queryByTestId('extension-slot')).not.toBeInTheDocument();
  });

  it('renders an error notification when loading the patient fails', () => {
    mockUsePatient.mockReturnValue({
      patient: undefined,
      isLoading: false,
      error: new Error('Patient not found'),
    } as ReturnType<typeof usePatient>);

    renderWorkspace();

    // The test harness's i18n stub does not interpolate, so we assert on the base message.
    expect(screen.getByText(/Error loading patient workspace/)).toBeInTheDocument();
    expect(screen.queryByTestId('extension-slot')).not.toBeInTheDocument();
  });

  it('renders an error notification when loading the visit fails', () => {
    mockUseVisit.mockReturnValue({ isLoading: false, error: new Error('Visit not found') } as ReturnType<
      typeof useVisit
    >);

    renderWorkspace();

    expect(screen.getByText(/Error loading patient workspace/)).toBeInTheDocument();
  });

  it('renders the form-widget extension slot with the encounter state once the patient loads', () => {
    renderWorkspace();

    expect(screen.getByTestId('extension-slot')).toHaveTextContent('form-widget-slot');
    expect(mockExtensionSlot).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'form-widget-slot',
        state: expect.objectContaining({
          view: 'form',
          formUuid: encounter.formUuid,
          visitUuid: encounter.visitUuid,
          visitTypeUuid: encounter.visitTypeUuid,
          patientUuid: encounter.patientUuid,
          encounterUuid: encounter.encounterUuid,
          patient: mockPatient,
          closeWorkspace: expect.any(Function),
          closeWorkspaceWithSavedChanges: expect.any(Function),
          promptBeforeClosing: expect.any(Function),
        }),
      }),
      expect.anything(),
    );
  });

  it('does not render the extension slot when no patient is returned', () => {
    mockUsePatient.mockReturnValue({ patient: undefined, isLoading: false, error: null } as ReturnType<
      typeof usePatient
    >);

    renderWorkspace();

    expect(screen.queryByTestId('extension-slot')).not.toBeInTheDocument();
  });
});
