import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReportDefinition } from '../../hooks/useReportDefinition';
import { useReportRequestsByReportUuid } from '../../hooks/useReportRequests';
import ReportHistory from './report-history.component';

vi.mock('../../hooks/useReportDefinition', () => ({ useReportDefinition: vi.fn() }));
vi.mock('../../hooks/useReportRequests', () => ({ useReportRequestsByReportUuid: vi.fn() }));

const mockUseReportDefinition = vi.mocked(useReportDefinition);
const mockUseReportRequests = vi.mocked(useReportRequestsByReportUuid);
const mockLaunchWorkspace = vi.mocked(launchWorkspace2);

const report = { uuid: 'r1', name: 'MOH 731', description: 'Comprehensive report', type: 'IndicatorReportDescriptor' };

const requests = [
  {
    id: 1,
    status: 'COMPLETED',
    requestDate: '2026-07-01T10:00:00.000+0300',
    evaluateStartDatetime: '2026-07-01T10:00:00.000+0300',
    evaluateCompleteDatetime: '2026-07-01T10:00:05.000+0300',
    requestedBy: { uuid: 'u1', display: 'Jane Doe' },
    report: { uuid: 'r1', name: 'MOH 731' },
    downloadFormats: [],
    downloadUrls: {},
  },
  {
    id: 2,
    status: 'FAILED',
    requestDate: '2026-06-30T10:00:00.000+0300',
    evaluateStartDatetime: null,
    evaluateCompleteDatetime: null,
    report: { uuid: 'r1', name: 'MOH 731' },
    downloadFormats: [],
    downloadUrls: {},
  },
];

const renderHistory = () =>
  render(
    <MemoryRouter initialEntries={['/report/r1']}>
      <Routes>
        <Route path="/report/:reportUuid" element={<ReportHistory />} />
        <Route path="/report/:reportUuid/requests/:requestId" element={<div>Report data view</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ReportHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReportDefinition.mockReturnValue({ report, parameters: [], isLoading: false, error: null } as never);
    mockUseReportRequests.mockReturnValue({
      requests,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    } as never);
  });

  it('shows a loading skeleton while data is fetched', () => {
    mockUseReportDefinition.mockReturnValue({ report: null, parameters: [], isLoading: true, error: null } as never);

    const { container } = renderHistory();

    expect(container.querySelector('.cds--skeleton__text')).toBeInTheDocument();
  });

  it('shows an error state when loading fails', () => {
    mockUseReportRequests.mockReturnValue({
      requests: [],
      isLoading: false,
      isValidating: false,
      error: new Error('nope'),
      mutate: vi.fn(),
    } as never);

    renderHistory();

    expect(screen.getByText('Error State')).toBeInTheDocument();
  });

  it('renders the report name, metrics, and run history rows', () => {
    renderHistory();

    expect(screen.getByRole('heading', { name: 'MOH 731' })).toBeInTheDocument();
    expect(screen.getByText('Total Runs')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
  });

  it('shows an empty notification when there are no runs', () => {
    mockUseReportRequests.mockReturnValue({
      requests: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    } as never);

    renderHistory();

    expect(screen.getByText('No runs yet')).toBeInTheDocument();
  });

  it('launches the request workspace when running the report', async () => {
    const user = userEvent.setup();
    renderHistory();

    await user.click(screen.getByRole('button', { name: 'Run Report Now' }));

    expect(mockLaunchWorkspace).toHaveBeenCalledWith(
      'report-request-workspace',
      expect.objectContaining({ reportUuid: 'r1' }),
    );
  });

  it('opens a completed run’s results from the view action', async () => {
    const user = userEvent.setup();
    renderHistory();

    await user.click(screen.getByRole('button', { name: /View/ }));

    expect(screen.getByText('Report data view')).toBeInTheDocument();
  });
});
