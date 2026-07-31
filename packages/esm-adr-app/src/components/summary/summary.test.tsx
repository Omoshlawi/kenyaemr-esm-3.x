import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type MappedAdrEncounter } from '../../types';
import { useAdrAssessmentEncounter } from '../encounters/encounter.resource';
import Summary from './summary.component';

vi.mock('../encounters/encounter.resource', () => ({
  useAdrAssessmentEncounter: vi.fn(),
}));

// Stub the Carbon DatePicker (a flatpickr wrapper that can't be driven in jsdom)
// with a trigger that fires onChange with a fixed range, keeping the real inputs.
vi.mock('@carbon/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@carbon/react')>()),
  DatePicker: ({ children, onChange }: { children: React.ReactNode; onChange: (dates: Date[]) => void }) => (
    <div>
      <button type="button" onClick={() => onChange([new Date(2026, 6, 1), new Date(2026, 6, 31)])}>
        select-range
      </button>
      {children}
    </div>
  ),
}));

// Isolate the summary from the encounters table, which has its own tests.
vi.mock('../encounters/adr-encounter.component', () => ({
  default: ({ encounters }: { encounters: MappedAdrEncounter[] }) => (
    <div data-testid="adr-encounter-table">{encounters.length} encounters</div>
  ),
}));

const mockUseAdrAssessmentEncounter = vi.mocked(useAdrAssessmentEncounter);

// The count lives in the assessment card; scope to it so calendar day numbers
// rendered by the date picker don't collide with the query.
const assessmentCount = () =>
  within(screen.getByText('Total ADR assessment').closest('div') as HTMLElement).getByText(/^\d+$/);

const ADR_ASSESSMENT_ENCOUNTER_TYPE_UUID = 'd18d6d8a-4be2-4115-ac7e-86cc0ec2b263';

const buildEncounter = (overrides: Partial<MappedAdrEncounter>): MappedAdrEncounter => ({
  encounterUuid: 'encounter-uuid-001',
  encounterTypeUuid: ADR_ASSESSMENT_ENCOUNTER_TYPE_UUID,
  patientUuid: 'patient-uuid-001',
  patientName: 'Jane Wanjiku',
  encounterType: 'Adverse Drug Reaction',
  encounterDatetime: '2026-07-30T08:45:00.000+03:00',
  visitTypeName: 'Outpatient Visit',
  formName: 'ADR Reporting Form',
  location: 'MTRH Adult Outpatient Clinic',
  provider: 'Dr. Amina Hassan',
  ...overrides,
});

function mockResource(overrides: Partial<ReturnType<typeof useAdrAssessmentEncounter>> = {}) {
  mockUseAdrAssessmentEncounter.mockReturnValue({
    encounters: [],
    isLoading: false,
    error: null,
    ...overrides,
  });
}

describe('Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResource();
  });

  it('shows a skeleton loader while encounters are loading', () => {
    mockResource({ isLoading: true });

    const { container } = render(<Summary />);

    expect(container.querySelector('.cds--skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('adr-encounter-table')).not.toBeInTheDocument();
  });

  it('renders the ADR assessment total and the encounters table once loaded', () => {
    mockResource({
      encounters: [
        buildEncounter({ encounterUuid: 'encounter-uuid-001' }),
        buildEncounter({ encounterUuid: 'encounter-uuid-002' }),
      ],
    });

    render(<Summary />);

    expect(screen.getByRole('heading', { name: 'ADR Assessment' })).toBeInTheDocument();
    expect(screen.getByText('Total ADR assessment')).toBeInTheDocument();
    expect(assessmentCount()).toHaveTextContent('2');
    expect(screen.getByTestId('adr-encounter-table')).toHaveTextContent('2 encounters');
  });

  it('only counts encounters whose type is the ADR assessment encounter type', () => {
    mockResource({
      encounters: [
        buildEncounter({ encounterUuid: 'encounter-uuid-001' }),
        buildEncounter({ encounterUuid: 'encounter-uuid-002', encounterTypeUuid: 'some-other-encounter-type' }),
      ],
    });

    render(<Summary />);

    // One matches the ADR assessment type; both are still handed to the table.
    expect(assessmentCount()).toHaveTextContent('1');
    expect(screen.getByTestId('adr-encounter-table')).toHaveTextContent('2 encounters');
  });

  it('renders a date range filter with start and end inputs', () => {
    render(<Summary />);

    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
    expect(screen.getByLabelText('End date')).toBeInTheDocument();
  });

  it('queries encounters scoped to the current day by default', () => {
    render(<Summary />);

    expect(mockUseAdrAssessmentEncounter).toHaveBeenCalledWith(
      expect.stringMatching(/T00:00:00$/),
      expect.stringMatching(/T23:59:59$/),
    );
  });

  it('re-queries encounters for the newly selected date range', async () => {
    const user = userEvent.setup();
    render(<Summary />);
    mockUseAdrAssessmentEncounter.mockClear();

    await user.click(screen.getByRole('button', { name: 'select-range' }));

    expect(mockUseAdrAssessmentEncounter).toHaveBeenLastCalledWith('2026-07-01T00:00:00', '2026-07-31T23:59:59');
  });
});
