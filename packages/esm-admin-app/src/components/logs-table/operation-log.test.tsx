import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LogTable from './operation-log-table.component';
import { ETLResponse } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback: string) => fallback }),
}));

vi.mock('@openmrs/esm-framework', () => ({
  useLayoutType: vi.fn(() => 'desktop'),
  usePagination: vi.fn((data) => ({
    results: data,
    currentPage: 1,
    goTo: vi.fn(),
  })),
  formatDate: vi.fn((date: Date) => date.toISOString()),
}));

vi.mock('@openmrs/esm-patient-common-lib', () => ({
  CardHeader: ({ title }: { title: string }) => <div>{title}</div>,
  PatientChartPagination: ({ currentItems, totalItems }: { currentItems: number; totalItems: number }) => (
    <div data-testid="pagination">
      {currentItems}/{totalItems}
    </div>
  ),
}));

vi.mock('../empty-state/empty-state-log.components', () => ({
  default: ({ subTitle }: { subTitle: string }) => <div data-testid="empty-state">{subTitle}</div>,
}));

vi.mock('@carbon/react', async (importOriginal) => {
  const original = await importOriginal<typeof import('@carbon/react')>();
  return {
    ...original,
    DataTable: ({
      children,
      rows,
      headers,
    }: {
      children: (props: any) => React.ReactNode;
      rows: any[];
      headers: any[];
    }) => {
      if (typeof children === 'function') {
        const renderRows = rows.map((row) => ({
          ...row,
          cells: headers.map((h) => ({
            id: `${row.id}:${h.key}`,
            value: row[h.key],
            info: { header: h.key },
          })),
        }));
        return children({
          rows: renderRows,
          headers,
          getTableProps: () => ({}),
          getHeaderProps: ({ header }: any) => ({ key: header.key }),
          getRowProps: () => ({}),
        });
      }
      return children;
    },
  };
});

vi.mock('classnames', () => ({ default: (...args: string[]) => args.filter(Boolean).join(' ') }));

vi.mock('./operation-log.scss', () => ({ default: {} }));

const mockLogData: ETLResponse[] = [
  {
    script_name: 'Script A',
    start_time: '2024-01-01T08:00:00Z',
    stop_time: '2024-01-01T09:00:00Z',
    status: 'Success',
  },
  {
    script_name: 'Script B',
    start_time: '2024-01-02T10:00:00Z',
    stop_time: '2024-01-02T11:00:00Z',
    status: 'Failed',
  },
];

describe('LogTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the card header', () => {
    render(<LogTable logData={mockLogData} isLoading={false} />);
    expect(screen.getByText('Facility Info')).toBeInTheDocument();
  });

  it('shows skeleton while loading with no data', () => {
    render(<LogTable logData={[]} isLoading={true} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows empty state when not loading and no data', () => {
    render(<LogTable logData={[]} isLoading={false} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No ETL Operation logs found')).toBeInTheDocument();
  });

  it('renders table headers when data is present', () => {
    render(<LogTable logData={mockLogData} isLoading={false} />);
    expect(screen.getByText('Procedure')).toBeInTheDocument();
    expect(screen.getByText('Start time')).toBeInTheDocument();
    expect(screen.getByText('End time')).toBeInTheDocument();
    expect(screen.getByText('Completion status')).toBeInTheDocument();
  });

  it('renders script names in the table', () => {
    render(<LogTable logData={mockLogData} isLoading={false} />);
    expect(screen.getByText('Script A')).toBeInTheDocument();
    expect(screen.getByText('Script B')).toBeInTheDocument();
  });

  it('renders Success status as a green tag', () => {
    render(<LogTable logData={mockLogData} isLoading={false} />);
    const successTag = screen.getByText('Success');
    expect(successTag).toBeInTheDocument();
  });

  it('renders Failed status as a red tag', () => {
    render(<LogTable logData={mockLogData} isLoading={false} />);
    const failedTag = screen.getByText('Failed');
    expect(failedTag).toBeInTheDocument();
  });

  it('renders pagination when data is present', () => {
    render(<LogTable logData={mockLogData} isLoading={false} />);
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('renders -- for missing start_time', () => {
    const dataWithMissingTime: ETLResponse[] = [
      { script_name: 'Script C', start_time: '', stop_time: '', status: 'Success' },
    ];
    render(<LogTable logData={dataWithMissingTime} isLoading={false} />);
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(2);
  });

  it('does not show empty state when data is present', () => {
    render(<LogTable logData={mockLogData} isLoading={false} />);
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });
});
