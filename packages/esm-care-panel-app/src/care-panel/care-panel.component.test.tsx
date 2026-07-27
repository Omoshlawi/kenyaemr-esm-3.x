import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CarePanel from './care-panel.component';
import { mockPatient } from '../../../../__mocks__/patient-summary.mock';

vi.mock('../program-summary/program-summary.component', () => ({
  __esModule: true,
  default: () => <div data-testid="mocked-program-summary" />,
}));
vi.mock('../program-enrollment/program-enrollment.component', () => ({
  __esModule: true,
  default: () => <div data-testid="mocked-program-enrollment" />,
}));

const mockPatientUuid = mockPatient.uuid;

vi.mock('@carbon/react', () => ({
  StructuredListSkeleton: () => <div data-testid="mocked-structured-list-skeleton" />,
  ContentSwitcher: ({ children }) => <div data-testid="mocked-content-switcher">{children}</div>,
  Switch: ({ text }) => <button>{text}</button>,
  InlineLoading: () => <div data-testid="mocked-inline-loading" />,
}));

describe('CarePanel Component', () => {
  it.skip('renders without crashing', () => {
    vi.spyOn(require('../hooks/useEnrollmentHistory'), 'useEnrollmentHistory').mockReturnValue({
      data: [{ patientUuid: mockPatientUuid }],
      isLoading: false,
      isError: false,
    });
    render(<CarePanel patientUuid={mockPatientUuid} formEntrySub={vi.fn()} />);
    expect(screen.getByText('Care Panel')).toBeInTheDocument();
  });

  it.skip('displays loading skeleton when isLoading is true', () => {
    vi.spyOn(require('../hooks/useEnrollmentHistory'), 'useEnrollmentHistory').mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    });

    render(<CarePanel patientUuid={mockPatientUuid} formEntrySub={vi.fn()} />);

    expect(screen.getByTestId('mocked-structured-list-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('mocked-program-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mocked-program-enrollment')).not.toBeInTheDocument();
  });

  it.skip('displays error message when isError is true', () => {
    vi.spyOn(require('../hooks/useEnrollmentHistory'), 'useEnrollmentHistory').mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    });

    render(<CarePanel patientUuid={mockPatientUuid} formEntrySub={vi.fn()} />);

    expect(screen.getByText('Error loading program enrollments')).toBeInTheDocument();
    expect(screen.queryByTestId('mocked-structured-list-skeleton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mocked-program-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mocked-program-enrollment')).not.toBeInTheDocument();
  });
});
