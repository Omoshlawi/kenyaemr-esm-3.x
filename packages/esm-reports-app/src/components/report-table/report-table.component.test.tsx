import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportTable from './report-table.component';

const mockLaunchWorkspace = vi.mocked(launchWorkspace2);

const headers = [
  { key: 'name', header: 'Name' },
  { key: 'group', header: 'Group' },
  { key: 'description', header: 'Description' },
];

const makeRows = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `report-${index}`,
    name: `Report ${String(index).padStart(2, '0')}`,
    group: 'HIV',
    description: `Description ${index}`,
  }));

const HistoryTarget = () => {
  const { id } = useParams();
  return <div>History for {id}</div>;
};

const renderTable = (rows: Array<Record<string, unknown>>) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <ReportTable tableRows={rows} tableHeaders={headers} tableTitle="Reports" tableDescription="All reports" />
          }
        />
        <Route path="/report/:id" element={<HistoryTarget />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ReportTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the provided rows and table title', () => {
    renderTable(makeRows(2));

    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Report 00')).toBeInTheDocument();
    expect(screen.getByText('Report 01')).toBeInTheDocument();
  });

  it('filters rows from the search box', async () => {
    const user = userEvent.setup();
    renderTable(makeRows(3));

    await user.type(screen.getByRole('searchbox'), 'Report 02');

    expect(screen.getByText('Report 02')).toBeInTheDocument();
    expect(screen.queryByText('Report 00')).not.toBeInTheDocument();
  });

  it('launches the request workspace for a row', async () => {
    const user = userEvent.setup();
    renderTable(makeRows(1));

    await user.click(screen.getByRole('button', { name: 'Options' }));
    await user.click(await screen.findByText('Request Report'));

    expect(mockLaunchWorkspace).toHaveBeenCalledWith('report-request-workspace', {
      reportUuid: 'report-0',
      navigate: expect.any(Function),
    });
  });

  it('navigates to a report’s history from the row menu', async () => {
    const user = userEvent.setup();
    renderTable(makeRows(1));

    await user.click(screen.getByRole('button', { name: 'Options' }));
    await user.click(await screen.findByText('View History'));

    expect(screen.getByText('History for report-0')).toBeInTheDocument();
  });

  it('paginates when there are more rows than a page holds', async () => {
    const user = userEvent.setup();
    renderTable(makeRows(20));

    expect(screen.getByText('Report 00')).toBeInTheDocument();
    expect(screen.queryByText('Report 16')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(screen.getByText('Report 16')).toBeInTheDocument();
  });

  it('renders status values as tags', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ReportTable
          tableRows={[{ id: 'r1', name: 'Report', status: 'COMPLETED' }]}
          tableHeaders={[
            { key: 'name', header: 'Name' },
            { key: 'status', header: 'Status' },
          ]}
          tableTitle="Reports"
          tableDescription="All reports"
        />
      </MemoryRouter>,
    );

    const tag = screen.getByText('COMPLETED');
    expect(tag.closest('.cds--tag')).toBeInTheDocument();
  });

  it('shows an empty table when the search matches nothing', async () => {
    const user = userEvent.setup();
    renderTable(makeRows(2));

    await user.type(screen.getByRole('searchbox'), 'no-such-report');

    const table = screen.getByRole('table');
    expect(within(table).queryByText('Report 00')).not.toBeInTheDocument();
  });
});
