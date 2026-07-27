import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useGroupedReports from '../hooks/useReports';
import GroupReports from './group-reports.component';

vi.mock('../hooks/useReports', () => ({ default: vi.fn() }));

const mockUseGroupedReports = vi.mocked(useGroupedReports);

const reports = [
  {
    name: 'HIV',
    indicator: [{ uuid: 'i1', name: 'HIV Indicator', description: 'hiv ind' }],
    patientFollowUpReports: [{ uuid: 'f1', name: 'HIV Follow-up', description: 'hiv fup' }],
  },
  {
    name: 'TB',
    indicator: [{ uuid: 'i2', name: 'TB Indicator', description: 'tb ind' }],
    patientFollowUpReports: [],
  },
];

const renderGroupReports = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <GroupReports />
    </MemoryRouter>,
  );

describe('GroupReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGroupedReports.mockReturnValue({ reports, isLoading: false, error: null, mutate: vi.fn() } as never);
  });

  it('shows a loading indicator while reports load', () => {
    mockUseGroupedReports.mockReturnValue({ reports: [], isLoading: true, error: null, mutate: vi.fn() } as never);

    renderGroupReports();

    expect(screen.getByText('Loading reports...')).toBeInTheDocument();
  });

  it('shows an error notification when loading fails', () => {
    mockUseGroupedReports.mockReturnValue({
      reports: [],
      isLoading: false,
      error: new Error('server exploded'),
      mutate: vi.fn(),
    } as never);

    renderGroupReports();

    expect(screen.getByText('Error loading reports')).toBeInTheDocument();
    expect(screen.getByText('server exploded')).toBeInTheDocument();
  });

  it('lists reports from every group by default', () => {
    renderGroupReports();

    expect(screen.getByText('HIV Indicator')).toBeInTheDocument();
    expect(screen.getByText('HIV Follow-up')).toBeInTheDocument();
    expect(screen.getByText('TB Indicator')).toBeInTheDocument();
  });

  it('filters the list to indicators only when the type filter changes', async () => {
    const user = userEvent.setup();
    renderGroupReports();

    await user.click(screen.getByText('All types'));
    await user.click(await screen.findByRole('option', { name: 'Indicators' }));

    expect(screen.getByText('HIV Indicator')).toBeInTheDocument();
    expect(screen.queryByText('HIV Follow-up')).not.toBeInTheDocument();
  });

  it('filters the list to a single group when the group filter changes', async () => {
    const user = userEvent.setup();
    renderGroupReports();

    await user.click(screen.getByText('All groups'));
    await user.click(await screen.findByRole('option', { name: 'TB' }));

    const table = screen.getByRole('table');
    expect(within(table).getByText('TB Indicator')).toBeInTheDocument();
    expect(within(table).queryByText('HIV Indicator')).not.toBeInTheDocument();
  });
});
