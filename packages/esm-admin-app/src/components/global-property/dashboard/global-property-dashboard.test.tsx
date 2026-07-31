import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';
import { openmrsFetch } from '@openmrs/esm-api';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import GlobalPropertyDashboard from './global-property-dashboard.component';

vi.mock('@openmrs/esm-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-api')>()),
  openmrsFetch: vi.fn(),
}));

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockLaunchWorkspace2 = vi.mocked(launchWorkspace2);

const mockProperties = [
  { uuid: 'uuid-1', property: 'setting.one', value: 'value1', description: 'First setting' },
  { uuid: 'uuid-2', property: 'setting.two', value: 'value2', description: 'Second setting' },
];

function mockFetchSuccess(results = mockProperties) {
  mockOpenmrsFetch.mockResolvedValue({
    data: { results, links: [], totalCount: results.length },
  } as unknown as Awaited<ReturnType<typeof openmrsFetch>>);
}

// Fresh SWR cache per render so responses do not leak between tests.
function renderDashboard() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <GlobalPropertyDashboard />
    </SWRConfig>,
  );
}

describe('GlobalPropertyDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page header with the dashboard title and illustration', async () => {
    mockFetchSuccess();
    renderDashboard();
    expect(screen.getByText('FacilityPictogram')).toBeInTheDocument();
    expect(screen.getAllByText('Global Property').length).toBeGreaterThan(0);
    await screen.findByText('setting.one');
  });

  it('requests global properties from the paginated systemsetting endpoint', async () => {
    mockFetchSuccess();
    renderDashboard();
    await screen.findByText('setting.one');
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      expect.stringContaining('/openmrs/ws/rest/v1/systemsetting?v=default&limit=10&startIndex=0&totalCount=true'),
    );
  });

  it('renders the fetched global properties in the table', async () => {
    mockFetchSuccess();
    renderDashboard();
    expect(await screen.findByText('setting.one')).toBeInTheDocument();
    expect(screen.getByText('value1')).toBeInTheDocument();
    expect(screen.getByText('setting.two')).toBeInTheDocument();
    expect(screen.getByText('value2')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Property')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('renders the toolbar actions for adding a property and uploading an image', async () => {
    mockFetchSuccess();
    renderDashboard();
    expect(screen.getByRole('button', { name: /add global property/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument();
    await screen.findByText('setting.one');
  });

  it('opens the add workspace when "Add global property" is clicked from the dashboard', async () => {
    mockFetchSuccess();
    renderDashboard();
    await screen.findByText('setting.one');
    fireEvent.click(screen.getByRole('button', { name: /add global property/i }));
    expect(mockLaunchWorkspace2).toHaveBeenCalledWith(
      'global-property-workspace',
      expect.objectContaining({
        systemSetting: undefined,
        mutateGlobalProperty: expect.any(Function),
      }),
    );
  });

  it('refetches with the search term as a query param when the user searches', async () => {
    mockFetchSuccess();
    renderDashboard();
    await screen.findByText('setting.one');
    const searchInput = screen.getByPlaceholderText('Search for global properties');
    fireEvent.change(searchInput, { target: { value: 'setting.two' } });
    await waitFor(() => {
      expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('q=setting.two'));
    });
  });

  it('keeps the page header visible and shows an error card when the request fails', async () => {
    mockOpenmrsFetch.mockRejectedValue(new Error('Network error'));
    renderDashboard();
    expect(await screen.findByRole('heading', { name: 'Global property' })).toBeInTheDocument();
    expect(screen.getByText('FacilityPictogram')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
