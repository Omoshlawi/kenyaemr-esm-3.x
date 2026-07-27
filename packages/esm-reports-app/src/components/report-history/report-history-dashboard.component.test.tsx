import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReportRequests } from '../../hooks/useReportRequests';
import ReportHistoryDashboard from './report-history-dashboard.component';

vi.mock('../../hooks/useReportRequests', () => ({ useReportRequests: vi.fn() }));

const mockUseReportRequests = vi.mocked(useReportRequests);

const requests = [
  {
    id: 1,
    status: 'COMPLETED',
    requestDate: '2026-07-01T10:00:00.000+0300',
    evaluateStartDatetime: '2026-07-01T10:00:00.000+0300',
    evaluateCompleteDatetime: '2026-07-01T10:00:03.000+0300',
    requestedBy: { uuid: 'u1', display: 'Jane Doe' },
    report: { uuid: 'r1', name: 'MOH 731' },
    downloadFormats: [],
    downloadUrls: {},
  },
  {
    id: 2,
    status: 'PROCESSING',
    requestDate: '2026-06-29T10:00:00.000+0300',
    evaluateStartDatetime: null,
    evaluateCompleteDatetime: null,
    report: { uuid: 'r2', name: 'TB Register' },
    downloadFormats: [],
    downloadUrls: {},
  },
];

const Target = () => {
  const params = useParams();
  return <div>Target {JSON.stringify(params)}</div>;
};

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/reports-history']}>
      <Routes>
        <Route path="/reports-history" element={<ReportHistoryDashboard />} />
        <Route path="/report/:reportUuid" element={<Target />} />
        <Route path="/report/:reportUuid/requests/:requestId" element={<Target />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ReportHistoryDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReportRequests.mockReturnValue({
      requests,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    } as never);
  });

  it('renders a loading skeleton while requests load', () => {
    mockUseReportRequests.mockReturnValue({ requests: [], isLoading: true, error: null } as never);

    const { container } = renderDashboard();

    expect(container.querySelector('.cds--skeleton__text')).toBeInTheDocument();
  });

  it('renders an error card when loading fails', () => {
    mockUseReportRequests.mockReturnValue({ requests: [], isLoading: false, error: new Error('down') } as never);

    renderDashboard();

    expect(screen.getByText('Report History Dashboard')).toBeInTheDocument();
  });

  it('renders an empty card when there is no history', () => {
    mockUseReportRequests.mockReturnValue({ requests: [], isLoading: false, error: null } as never);

    renderDashboard();

    expect(screen.getByText('No report history')).toBeInTheDocument();
  });

  it('lists every report request with its status', () => {
    renderDashboard();

    expect(screen.getByText('MOH 731')).toBeInTheDocument();
    expect(screen.getByText('TB Register')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('PROCESSING')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('filters the table by the search term', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.type(screen.getByRole('searchbox'), 'TB Register');

    expect(screen.getByText('TB Register')).toBeInTheDocument();
    expect(screen.queryByText('MOH 731')).not.toBeInTheDocument();
  });

  it('navigates to a completed run’s results from the row menu', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getAllByRole('button', { name: 'Options' })[0]);
    await user.click(await screen.findByText('View results'));

    expect(screen.getByText(/"requestId":"1"/)).toBeInTheDocument();
  });
});
