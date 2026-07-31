import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDatetime, launchWorkspace2, parseDate, showModal, useLayoutType } from '@openmrs/esm-framework';
import userEvent from '@testing-library/user-event';
import { type MappedAdrEncounter } from '../../types';
import AdrEncounter from './adr-encounter.component';

const mockLaunchWorkspace = vi.mocked(launchWorkspace2);
const mockShowModal = vi.mocked(showModal);
const mockUseLayoutType = vi.mocked(useLayoutType);

const ADR_WORKSPACE = 'patient-adr-workspace';
const EMAIL_MODAL = 'adr-email-modal';
const PRINT_MODAL = 'adr-print-preview-modal';

function createEncounter(overrides: Partial<MappedAdrEncounter> & Pick<MappedAdrEncounter, 'encounterUuid'>) {
  return {
    encounterTypeUuid: 'encounter-type-uuid-001',
    patientUuid: 'patient-uuid-001',
    patientName: 'Jane Wanjiku',
    encounterType: 'Adverse Drug Reaction',
    encounterDatetime: '2027-07-28T09:30:00.000+03:00',
    visitTypeName: 'Outpatient Visit',
    formName: 'ADR Reporting Form',
    location: 'MTRH Adult Outpatient Clinic',
    provider: 'Dr. Amina Hassan',
    formUuid: 'form-uuid-001',
    visitUuid: 'visit-uuid-001',
    visitTypeUuid: 'visit-type-uuid-001',
    ...overrides,
  } satisfies MappedAdrEncounter;
}

const mockMappedAdrEncounters: MappedAdrEncounter[] = [
  createEncounter({
    encounterUuid: 'encounter-uuid-001',
    patientUuid: 'patient-uuid-001',
    patientName: 'Jane Wanjiku',
    encounterDatetime: '2027-07-28T09:30:00.000+03:00',
  }),
  createEncounter({
    encounterUuid: 'encounter-uuid-002',
    patientUuid: 'patient-uuid-002',
    patientName: 'Brian Otieno',
    encounterDatetime: '2026-06-29T14:15:00.000+03:00',
    visitTypeName: 'Emergency Visit',
    provider: 'Dr. David Kamau',
  }),
  createEncounter({
    encounterUuid: 'encounter-uuid-003',
    patientUuid: 'patient-uuid-003',
    patientName: 'Faith Chebet',
    encounterDatetime: '2026-07-30T08:45:00.000+03:00',
    visitTypeName: 'Inpatient Visit',
    provider: 'Clinical Officer Peter Kiptoo',
  }),
  createEncounter({
    encounterUuid: 'encounter-uuid-004',
    patientUuid: 'patient-uuid-004',
    patientName: 'Samuel Mwangi',
    encounterDatetime: '2026-07-30T11:20:00.000+03:00',
    provider: 'Nurse Grace Njeri',
  }),
];

const byMostRecent = (encounters: MappedAdrEncounter[]) =>
  [...encounters].sort(
    (first, second) => new Date(second.encounterDatetime).getTime() - new Date(first.encounterDatetime).getTime(),
  );

describe('AdrEncounter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLayoutType.mockReturnValue('small-desktop');
  });

  it('renders an empty state when there are no encounters', () => {
    render(<AdrEncounter encounters={[]} />);

    expect(screen.getByRole('heading', { name: 'No encounters found' })).toBeInTheDocument();
    expect(screen.getByTitle('Empty data illustration')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the ADR assessment encounters in a table ordered by most recent', () => {
    render(<AdrEncounter encounters={mockMappedAdrEncounters} />);

    expect(screen.getByText('ADR Assessment Encounters')).toBeInTheDocument();
    expect(screen.getByText('Summary of ADR assessment encounters')).toBeInTheDocument();

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Date & time',
      'Name',
      'Visit type',
      'Form name',
      'Provider',
      'Actions',
    ]);

    const [, ...dataRows] = screen.getAllByRole('row');
    expect(dataRows).toHaveLength(mockMappedAdrEncounters.length);

    const expectedOrder = byMostRecent(mockMappedAdrEncounters);
    dataRows.forEach((row, index) => {
      const encounter = expectedOrder[index];
      const cells = within(row).getAllByRole('cell');

      expect(cells).toHaveLength(6);
      expect(cells[0]).toHaveTextContent(formatDatetime(parseDate(encounter.encounterDatetime), { mode: 'wide' }));
      expect(cells[1]).toHaveTextContent(encounter.patientName);
      expect(cells[2]).toHaveTextContent(encounter.visitTypeName);
      expect(cells[3]).toHaveTextContent(encounter.formName);
      expect(cells[4]).toHaveTextContent(encounter.provider);

      const actionsCell = within(cells[5]);
      expect(actionsCell.getByRole('button', { name: /review/i })).toBeInTheDocument();
      expect(actionsCell.getByRole('button', { name: /print report/i })).toBeInTheDocument();
      expect(actionsCell.getByRole('button', { name: /send email/i })).toBeInTheDocument();
    });
  });

  it('falls back to "--" when an encounter has no provider', () => {
    render(<AdrEncounter encounters={[createEncounter({ encounterUuid: 'encounter-uuid-001', provider: '' })]} />);

    const [, row] = screen.getAllByRole('row');
    expect(within(row).getAllByRole('cell')[4]).toHaveTextContent('--');
  });

  it('falls back to "--" for an encounter with no date & time and sorts it last', () => {
    // Two undated encounters bracketing a dated one so the sort comparator sees
    // a missing date on both sides of the comparison.
    render(
      <AdrEncounter
        encounters={[
          createEncounter({ encounterUuid: 'encounter-uuid-001', encounterDatetime: '', patientName: 'No Date A' }),
          createEncounter({
            encounterUuid: 'encounter-uuid-002',
            encounterDatetime: '2027-07-28T09:30:00.000+03:00',
            patientName: 'Has Date',
          }),
          createEncounter({ encounterUuid: 'encounter-uuid-003', encounterDatetime: '', patientName: 'No Date B' }),
        ]}
      />,
    );

    const [, dated, ...undatedRows] = screen.getAllByRole('row');
    expect(within(dated).getAllByRole('cell')[1]).toHaveTextContent('Has Date');
    undatedRows.forEach((row) => expect(within(row).getAllByRole('cell')[0]).toHaveTextContent('--'));
  });

  it('renders large controls on a non-desktop layout', () => {
    mockUseLayoutType.mockReturnValue('tablet');
    render(<AdrEncounter encounters={mockMappedAdrEncounters} />);

    // Rendering without throwing exercises the non-desktop (responsive size) branch.
    expect(screen.getByText('ADR Assessment Encounters')).toBeInTheDocument();
  });

  it('launches the review workspace for the selected encounter', async () => {
    const user = userEvent.setup();
    render(<AdrEncounter encounters={mockMappedAdrEncounters} />);

    const [firstEncounter] = byMostRecent(mockMappedAdrEncounters);
    await user.click(screen.getAllByRole('button', { name: 'Review' })[0]);

    expect(mockLaunchWorkspace).toHaveBeenCalledWith(ADR_WORKSPACE, { encounter: firstEncounter }, {}, {});
  });

  it('opens the email modal for the selected encounter and disposes it on close or send', async () => {
    const user = userEvent.setup();
    const dispose = vi.fn();
    mockShowModal.mockReturnValue(dispose);
    render(<AdrEncounter encounters={mockMappedAdrEncounters} />);

    const [firstEncounter] = byMostRecent(mockMappedAdrEncounters);
    await user.click(screen.getAllByRole('button', { name: 'Send Email' })[0]);

    expect(mockShowModal).toHaveBeenCalledWith(
      EMAIL_MODAL,
      expect.objectContaining({
        encounter: firstEncounter,
        onClose: expect.any(Function),
        onEmailSent: expect.any(Function),
      }),
    );

    // Both callbacks dispose the modal returned by showModal.
    const { onClose, onEmailSent } = mockShowModal.mock.calls[0][1] as {
      onClose: () => void;
      onEmailSent: () => void;
    };
    onEmailSent();
    onClose();
    expect(dispose).toHaveBeenCalledTimes(2);
  });

  it('opens the print preview modal for the selected encounter', async () => {
    const user = userEvent.setup();
    render(<AdrEncounter encounters={mockMappedAdrEncounters} />);

    const [firstEncounter] = byMostRecent(mockMappedAdrEncounters);
    await user.click(screen.getAllByRole('button', { name: 'Print Report' })[0]);

    expect(mockShowModal).toHaveBeenCalledWith(
      PRINT_MODAL,
      expect.objectContaining({
        onClose: expect.any(Function),
        title: `ADR Report - ${firstEncounter.patientName}`,
        documentUrl: expect.stringContaining(firstEncounter.patientUuid),
      }),
    );
  });

  it('does not paginate a single page of encounters', () => {
    render(<AdrEncounter encounters={mockMappedAdrEncounters} />);

    expect(screen.queryByLabelText('Next page')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Previous page')).not.toBeInTheDocument();
  });

  it('paginates and navigates between pages when there are many encounters', async () => {
    const user = userEvent.setup();
    const manyEncounters: MappedAdrEncounter[] = Array.from({ length: 40 }, (_, index) => {
      const sequence = String(index + 1).padStart(3, '0');
      return createEncounter({
        encounterUuid: `encounter-uuid-${sequence}`,
        patientUuid: `patient-uuid-${sequence}`,
        visitUuid: `visit-uuid-${sequence}`,
        patientName: `Patient ${sequence}`,
      });
    });

    render(<AdrEncounter encounters={manyEncounters} />);

    expect(screen.getByText('1–10 of 40 items')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Next page'));
    expect(screen.getByText('11–20 of 40 items')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Previous page'));
    expect(screen.getByText('1–10 of 40 items')).toBeInTheDocument();

    const pageSelect = screen.getByRole('combobox', { name: /page of \d+ pages/i });
    await user.selectOptions(pageSelect, '3');
    expect(pageSelect).toHaveValue('3');

    // Changing the page size resets the range and re-paginates.
    const pageSizeSelect = screen.getByRole('combobox', { name: /items per page/i });
    await user.selectOptions(pageSizeSelect, '20');
    expect(screen.getByText('1–20 of 40 items')).toBeInTheDocument();
  });
});
