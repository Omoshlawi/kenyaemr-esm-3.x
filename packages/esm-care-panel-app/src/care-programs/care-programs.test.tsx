import React from 'react';
import { screen, render } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import CarePrograms from './care-programs.component';
import { useCarePrograms, type PatientCarePrograms } from '../hooks/useCarePrograms';
import { launchProgramForm, launchDeleteProgramDialog, usePatientEnrolledPrograms } from './care-program.resource';

vi.mock('../hooks/useCarePrograms');

vi.mock('./care-program.resource', () => ({
  usePatientEnrolledPrograms: vi.fn(),
  launchProgramForm: vi.fn(),
  launchDeleteProgramDialog: vi.fn(),
}));

vi.mock('./useCareProgramForms', () => ({
  default: () => ({
    careProgramForms: [],
    getProgramForms: () => [],
    getProgramEnrollmentForm: () => undefined,
  }),
}));

vi.mock('@openmrs/esm-patient-common-lib', async () => ({
  ...(await vi.importActual('@openmrs/esm-patient-common-lib')),
  usePatientChartStore: () => ({ mutateVisitContext: vi.fn(), visitContext: null, patient: null }),
  useLaunchWorkspaceRequiringVisit: () => vi.fn(),
}));

const mockUseCarePrograms = vi.mocked(useCarePrograms);
const mockUsePatientEnrolledPrograms = vi.mocked(usePatientEnrolledPrograms);
const mockLaunchProgramForm = vi.mocked(launchProgramForm);

const mockEligiblePrograms: Array<PatientCarePrograms> = [
  {
    uuid: '9f144a34-3a4a-44a9-8486-6b7af6cc64f6',
    display: 'TB',
    enrollmentFormUuid: '89994550-9939-40f3-afa6-173bce445c79',
    discontinuationFormUuid: '4b296dd0-f6be-4007-9eb8-d0fd4e94fb3a',
    enrollmentStatus: 'eligible',
  },
];

const renderCarePrograms = () => {
  render(<CarePrograms patientUuid="some-patient-uuid" patient={{} as fhir.Patient} />);
};

describe('CarePrograms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePatientEnrolledPrograms.mockReturnValue({
      enrollments: [],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    } as any);
  });

  test('renders a skeleton loader while care programs are loading', () => {
    mockUseCarePrograms.mockReturnValue({
      eligibleCarePrograms: [],
      activeCarePrograms: [],
      isLoading: true,
      isValidating: false,
      error: null,
      mutateEligiblePrograms: vi.fn(),
    } as any);

    renderCarePrograms();

    expect(document.querySelector('.cds--skeleton')).toBeInTheDocument();
  });

  test('displays eligible care programs and launches the enrollment form when Enroll is clicked', async () => {
    const user = userEvent.setup();
    mockUseCarePrograms.mockReturnValue({
      eligibleCarePrograms: mockEligiblePrograms,
      activeCarePrograms: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutateEligiblePrograms: vi.fn(),
    } as any);

    renderCarePrograms();

    expect(screen.getByRole('heading', { name: 'Care Programs' })).toBeInTheDocument();
    expect(screen.getByText('Program Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    const enrollButton = screen.getByRole('button', { name: /Enroll/ });
    await user.click(enrollButton);

    expect(mockLaunchProgramForm).toHaveBeenCalledWith(
      mockEligiblePrograms[0].uuid,
      'some-patient-uuid',
      undefined,
      expect.any(Function),
    );
    expect(launchDeleteProgramDialog).not.toHaveBeenCalled();
  });
});
