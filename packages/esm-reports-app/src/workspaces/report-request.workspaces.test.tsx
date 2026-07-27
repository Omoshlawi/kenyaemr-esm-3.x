import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestReport, useReportDefinition } from '../hooks/useReportDefinition';
import ReportRequestWorkspaces from './report-request.workspaces';

vi.mock('../hooks/useReportDefinition', () => ({
  useReportDefinition: vi.fn(),
  requestReport: vi.fn(),
}));

const mockUseReportDefinition = vi.mocked(useReportDefinition);
const mockRequestReport = vi.mocked(requestReport);
const mockShowSnackbar = vi.mocked(showSnackbar);

const report = { uuid: 'r1', name: 'MOH 731', description: 'Comprehensive report' };
const parameters = [
  { name: 'startDate', label: 'Start date', type: 'java.util.Date', defaultValue: '2026-01-01' },
  { name: 'includeChildren', label: 'Include children', type: 'java.lang.Boolean', defaultValue: false },
  { name: 'limit', label: 'Limit', type: 'java.lang.Integer', defaultValue: 100 },
  { name: 'county', label: 'County', type: 'java.lang.String', defaultValue: 'Nairobi' },
];

const closeWorkspace = vi.fn();
const mutateRequests = vi.fn();
const navigate = vi.fn();

const renderWorkspace = (workspaceProps: Record<string, unknown> = { reportUuid: 'r1', mutateRequests, navigate }) =>
  render(
    <ReportRequestWorkspaces
      closeWorkspace={closeWorkspace as never}
      workspaceProps={workspaceProps as never}
      {...({} as never)}
    />,
  );

describe('ReportRequestWorkspaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReportDefinition.mockReturnValue({ report, parameters, isLoading: false, error: null } as never);
  });

  it('shows a skeleton while the definition loads', () => {
    mockUseReportDefinition.mockReturnValue({ report: null, parameters: [], isLoading: true, error: null } as never);

    const { container } = renderWorkspace();

    expect(container.querySelector('.cds--skeleton__text')).toBeInTheDocument();
  });

  it('shows an error state when the definition fails to load', () => {
    mockUseReportDefinition.mockReturnValue({
      report: null,
      parameters: [],
      isLoading: false,
      error: new Error('boom'),
    } as never);

    renderWorkspace();

    expect(screen.getByText('Error State')).toBeInTheDocument();
  });

  it('explains when the report cannot be found', () => {
    mockUseReportDefinition.mockReturnValue({ report: null, parameters: [], isLoading: false, error: null } as never);

    renderWorkspace();

    expect(screen.getByText('Report not found.')).toBeInTheDocument();
  });

  it('renders a field for each parameter', () => {
    renderWorkspace();

    expect(screen.getByText('MOH 731')).toBeInTheDocument();
    expect(screen.getByLabelText('Start date')).toBeInTheDocument();
    expect(screen.getByLabelText('Include children')).toBeInTheDocument();
    expect(screen.getByText('County')).toBeInTheDocument();
  });

  it('humanizes a parameter name when no label is provided', () => {
    mockUseReportDefinition.mockReturnValue({
      report,
      parameters: [{ name: 'includeChildren', label: '', type: 'java.lang.String', defaultValue: 'x' }],
      isLoading: false,
      error: null,
    } as never);

    renderWorkspace();

    expect(screen.getByLabelText('Include Children')).toBeInTheDocument();
  });

  it('marks a parameter required when it has no default value', () => {
    mockUseReportDefinition.mockReturnValue({
      report,
      parameters: [{ name: 'reportDate', label: 'Report date', type: 'java.lang.String', defaultValue: null }],
      isLoading: false,
      error: null,
    } as never);

    renderWorkspace();

    expect(screen.getByLabelText('Report date')).toBeInTheDocument();
    // a required field with no default keeps the submit button disabled until dirtied
    expect(screen.getByRole('button', { name: 'Request report' })).toBeDisabled();
  });

  it('tells the user when a report has no parameters', () => {
    mockUseReportDefinition.mockReturnValue({ report, parameters: [], isLoading: false, error: null } as never);

    renderWorkspace();

    expect(screen.getByText('This report has no parameters. Submit to queue it for processing.')).toBeInTheDocument();
  });

  it('queues the report and closes the workspace on success', async () => {
    const user = userEvent.setup();
    mockRequestReport.mockResolvedValue({} as never);
    renderWorkspace();

    await user.click(screen.getByLabelText('Include children'));
    await user.click(screen.getByRole('button', { name: 'Request report' }));

    await waitFor(() =>
      expect(mockRequestReport).toHaveBeenCalledWith('r1', expect.objectContaining({ county: 'Nairobi' })),
    );
    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
    expect(mutateRequests).toHaveBeenCalled();
    expect(closeWorkspace).toHaveBeenCalledWith({ discardUnsavedChanges: true });
    expect(navigate).toHaveBeenCalledWith('/report/r1');
  });

  it('surfaces a server error when queuing fails', async () => {
    const user = userEvent.setup();
    mockRequestReport.mockRejectedValue({ responseBody: { error: { message: 'invalid parameters' } } });
    renderWorkspace();

    await user.click(screen.getByLabelText('Include children'));
    await user.click(screen.getByRole('button', { name: 'Request report' }));

    await waitFor(() =>
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error', subtitle: 'invalid parameters' }),
      ),
    );
  });

  it('closes the workspace when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(closeWorkspace).toHaveBeenCalled();
  });
});
