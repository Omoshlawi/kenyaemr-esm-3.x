import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReportData } from '../../hooks/useReportData';
import ReportView from './report-view.component';

vi.mock('../../hooks/useReportData', () => ({ useReportData: vi.fn() }));

const mockUseReportData = vi.mocked(useReportData);

const rowDataSet = {
  key: 'ds1',
  name: 'Patients',
  columns: [
    { name: 'name', label: 'Name' },
    { name: 'age', label: 'Age' },
    { name: 'active', label: 'Active' },
  ],
  rows: [{ id: 1, name: { display: 'Amina' }, age: 30, active: true }],
};

const indicatorDataSet = {
  key: 'ds2',
  name: 'Totals',
  columns: [{ name: 'total', label: 'Total Patients' }],
  rows: [],
  values: { total: '1,234' },
};

const reportData = {
  request: {
    id: 7,
    requestDate: '2026-07-01T10:00:00.000+0300',
    requestedBy: { display: 'Jane Doe' },
    downloadFormats: [],
    downloadUrls: {},
  },
  definition: { name: 'MOH 731', parameters: [] },
  parameters: { startDate: '2026-01-01', location: null },
  dataSets: { ds1: rowDataSet, ds2: indicatorDataSet },
};

const renderView = () =>
  render(
    <MemoryRouter initialEntries={['/report/r1/requests/7']}>
      <Routes>
        <Route path="/report/:reportUuid/requests/:requestId" element={<ReportView />} />
        <Route path="/report/:reportUuid" element={<div>Report history page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReportData.mockReturnValue({ reportData, isLoading: false, error: null, mutate: vi.fn() } as never);
  });

  it('shows a loading skeleton while report data loads', () => {
    mockUseReportData.mockReturnValue({ reportData: null, isLoading: true, error: null } as never);

    const { container } = renderView();

    expect(container.querySelector('.cds--skeleton__text')).toBeInTheDocument();
  });

  it('shows an error state when the report data is missing', () => {
    mockUseReportData.mockReturnValue({ reportData: null, isLoading: false, error: null } as never);

    renderView();

    expect(screen.getByText('Error State')).toBeInTheDocument();
  });

  it('renders the report title, parameters, and dataset tables', () => {
    renderView();

    expect(screen.getByRole('heading', { name: 'MOH 731' })).toBeInTheDocument();
    expect(screen.getByText('startDate')).toBeInTheDocument();
    // object value with a display field is rendered as its display text
    expect(screen.getByText('Amina')).toBeInTheDocument();
    // boolean value renders as text
    expect(screen.getByText('true')).toBeInTheDocument();
    // indicator dataset renders its value
    expect(screen.getByText('Total Patients')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('expands and collapses all report sections with the toggle', async () => {
    const user = userEvent.setup();
    renderView();

    expect(screen.getByRole('button', { name: /Expand all/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Expand all/ }));

    expect(screen.getByRole('button', { name: /Collapse all/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Collapse all/ }));

    expect(screen.getByRole('button', { name: /Expand all/ })).toBeInTheDocument();
  });

  it('renders an empty state when the report has no datasets', () => {
    mockUseReportData.mockReturnValue({
      reportData: { ...reportData, dataSets: {} },
      isLoading: false,
      error: null,
    } as never);

    renderView();

    expect(screen.getByText('No report data')).toBeInTheDocument();
    expect(screen.getByText('This report did not return any data.')).toBeInTheDocument();
  });

  it('renders fallbacks for empty and unstructured values', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const edgeDataSet = {
      key: 'edge',
      name: 'Edge',
      columns: [
        { name: 'blank', label: 'Blank' },
        { name: 'obj', label: 'Object' },
        { name: 'sym', label: 'Symbol' },
        { name: 'circ', label: 'Circular' },
      ],
      rows: [{ blank: '', obj: { foo: 'bar' }, sym: Symbol('x'), circ: circular }],
    };
    mockUseReportData.mockReturnValue({
      reportData: { ...reportData, parameters: {}, dataSets: { edge: edgeDataSet } },
      isLoading: false,
      error: null,
    } as never);

    renderView();

    // empty string, symbol, and non-serializable circular values all render the placeholder
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(3);
    // an object without display/value/name is serialized to JSON
    expect(screen.getByText('{"foo":"bar"}')).toBeInTheDocument();
  });

  it('changes the page size of a dataset table', async () => {
    const user = userEvent.setup();
    const bigDataSet = {
      key: 'big',
      name: 'Big',
      columns: [{ name: 'label', label: 'Label' }],
      rows: Array.from({ length: 40 }, (_, index) => ({ label: `Row ${String(index).padStart(2, '0')}` })),
    };
    mockUseReportData.mockReturnValue({
      reportData: { ...reportData, parameters: {}, dataSets: { big: bigDataSet } },
      isLoading: false,
      error: null,
    } as never);

    renderView();

    expect(screen.queryByText('Row 20')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Items per page:'), '30');

    expect(screen.getByText('Row 20')).toBeInTheDocument();
  });

  it('paginates a large dataset and changes the page size', async () => {
    const user = userEvent.setup();
    const bigDataSet = {
      key: 'big',
      name: 'Big',
      columns: [{ name: 'label', label: 'Label' }],
      rows: Array.from({ length: 20 }, (_, index) => ({ label: `Row ${String(index).padStart(2, '0')}` })),
    };
    mockUseReportData.mockReturnValue({
      reportData: { ...reportData, parameters: {}, dataSets: { big: bigDataSet } },
      isLoading: false,
      error: null,
    } as never);

    renderView();

    expect(screen.getByText('Row 00')).toBeInTheDocument();
    expect(screen.queryByText('Row 16')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Row 16')).toBeInTheDocument();
  });

  it('returns to the report history from the breadcrumb', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: 'Report History' }));

    expect(screen.getByText('Report history page')).toBeInTheDocument();
  });
});
