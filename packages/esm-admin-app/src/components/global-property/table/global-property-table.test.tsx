import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GlobalPropertyTable from './global-property-table.component';

const mockGoTo = vi.fn();
const mockMutate = vi.fn();
const mockLaunchWorkspace2 = vi.fn();
const mockShowModal = vi.fn(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string, opts?: Record<string, unknown>) => fallback }),
}));

vi.mock('@openmrs/esm-framework', () => ({
  useLayoutType: vi.fn(() => 'desktop'),
  isDesktop: vi.fn(() => true),
  launchWorkspace2: (...args: unknown[]) => mockLaunchWorkspace2(...args),
  showModal: (...args: unknown[]) => mockShowModal(...args),
  useDebounce: vi.fn((val: string) => val),
  usePaginationInfo: vi.fn(() => ({ pageSizes: [10, 20, 50] })),
  ErrorCard: ({ headerTitle }: { headerTitle: string }) => <div data-testid="error-card">{headerTitle}</div>,
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
          getRowProps: ({ row }: any) => ({ key: row.id }),
          getCellProps: ({ cell }: any) => ({ key: cell.id }),
          getToolbarProps: () => ({}),
          getTableContainerProps: () => ({}),
          getBatchActionProps: () => ({ shouldShowBatchActions: false }),
        });
      }
      return children;
    },
    Button: ({ children, onClick, disabled, iconDescription, hasIconOnly, type }: any) => (
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={hasIconOnly ? iconDescription : undefined}
        type={type || 'button'}>
        {hasIconOnly ? null : children}
      </button>
    ),
    OverflowMenu: ({ children }: any) => <div>{children}</div>,
    OverflowMenuItem: ({ itemText, onClick }: any) => <button onClick={onClick}>{itemText}</button>,
  };
});

vi.mock('../hooks/useGlobalProperty', () => ({
  useGlobalProperties: vi.fn(),
}));

import { useGlobalProperties } from '../hooks/useGlobalProperty';

const mockProperties = [
  { uuid: 'uuid-1', property: 'setting.one', value: 'value1', description: 'First setting' },
  { uuid: 'uuid-2', property: 'setting.two', value: 'value2', description: 'Second setting' },
];

function setupMock(overrides = {}) {
  (useGlobalProperties as ReturnType<typeof vi.fn>).mockReturnValue({
    isLoading: false,
    data: mockProperties,
    error: null,
    goTo: mockGoTo,
    currentPage: 1,
    totalCount: 2,
    mutate: mockMutate,
    ...overrides,
  });
}

describe('GlobalPropertyTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the table with property and value columns', () => {
    setupMock();
    render(<GlobalPropertyTable />);
    expect(screen.getByText('Property')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('renders all global property rows', () => {
    setupMock();
    render(<GlobalPropertyTable />);
    expect(screen.getByText('setting.one')).toBeInTheDocument();
    expect(screen.getByText('value1')).toBeInTheDocument();
    expect(screen.getByText('setting.two')).toBeInTheDocument();
    expect(screen.getByText('value2')).toBeInTheDocument();
  });

  it('renders the table without data rows when no properties exist', () => {
    setupMock({ data: [], totalCount: 0 });
    render(<GlobalPropertyTable />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText('setting.one')).not.toBeInTheDocument();
  });

  it('opens the add workspace when "Add global property" button is clicked', () => {
    setupMock();
    render(<GlobalPropertyTable />);
    fireEvent.click(screen.getByText('Add global property'));
    expect(mockLaunchWorkspace2).toHaveBeenCalledWith(
      'global-property-workspace',
      expect.objectContaining({
        systemSetting: undefined,
        mutateGlobalProperty: mockMutate,
      }),
    );
  });

  it('opens the upload image workspace when "Upload image" button is clicked', () => {
    setupMock();
    render(<GlobalPropertyTable />);
    fireEvent.click(screen.getByText('Upload image'));
    expect(mockLaunchWorkspace2).toHaveBeenCalledWith(
      'upload-logo-workspace',
      expect.objectContaining({
        mutateGlobalProperty: mockMutate,
      }),
    );
  });

  it('opens the edit workspace with the correct property when edit is clicked', () => {
    setupMock();
    render(<GlobalPropertyTable />);
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    fireEvent.click(editButtons[0]);
    expect(mockLaunchWorkspace2).toHaveBeenCalledWith(
      'global-property-workspace',
      expect.objectContaining({
        systemSetting: mockProperties[0],
      }),
    );
  });

  it('opens the delete modal with the correct property when delete is clicked', () => {
    setupMock();
    render(<GlobalPropertyTable />);
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]);
    expect(mockShowModal).toHaveBeenCalledWith(
      'delete-global-property-modal',
      expect.objectContaining({
        property: 'setting.one',
        uuid: 'uuid-1',
      }),
    );
  });

  it('filters results and resets to page 1 when user types in the search box', async () => {
    setupMock({ currentPage: 2 });
    render(<GlobalPropertyTable />);
    const searchInput = screen.getByPlaceholderText('Search for global properties');
    fireEvent.change(searchInput, { target: { value: 'setting' } });
    await waitFor(() => {
      expect(mockGoTo).toHaveBeenCalledWith(1);
    });
  });

  it('renders a search input for filtering properties', () => {
    setupMock();
    render(<GlobalPropertyTable />);
    expect(screen.getByPlaceholderText('Search for global properties')).toBeInTheDocument();
  });

  it('renders an error card when the hook returns an error', () => {
    setupMock({ error: new Error('Network error'), data: [] });
    render(<GlobalPropertyTable />);
    expect(screen.getByTestId('error-card')).toBeInTheDocument();
    expect(screen.getByText('Global property')).toBeInTheDocument();
  });
});
