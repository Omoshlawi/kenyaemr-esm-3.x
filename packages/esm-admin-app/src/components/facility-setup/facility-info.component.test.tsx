import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type FacilityRegistryRecord } from './type';
import FacilityRegistryView from './facility-info.component';
import { syncFacilityRegistry, useFacilityRegistry } from './useFacilityRegistry';

vi.mock('./useFacilityRegistry', () => ({
  syncFacilityRegistry: vi.fn(),
  useFacilityRegistry: vi.fn(),
}));

const facility: FacilityRegistryRecord = {
  fr_code: 'FR-12345',
  official_name: 'Mbagathi County Hospital',
  registration_number: 'REG-001',
  is_hub: false,
  license_status: 'ACTIVE',
  regulatory_operational_status: 'OPERATIONAL',
  sha_operational_status: 'ACTIVE',
  sha_contract_status: '',
  address: {
    country: 'Kenya',
    county: 'Nairobi',
    latitude: -1.301,
    longitude: 36.805,
  },
  facility_administrator_name: 'Alice Wanjiku',
  facility_administrator_phone: '+254711111111',
  facility_administrator_email: 'alice@example.com',
  sha_contracted_services: ['Outpatient', { name: 'Maternity' }, { code: 'DIALYSIS' } as { name?: string }],
};

const mutate = vi.fn();
const mockUseFacilityRegistry = vi.mocked(useFacilityRegistry);
const mockSyncFacilityRegistry = vi.mocked(syncFacilityRegistry);
const mockShowSnackbar = vi.mocked(showSnackbar);

function mockFacility(overrides: Partial<FacilityRegistryRecord> = {}) {
  mockUseFacilityRegistry.mockReturnValue({
    facility: { ...facility, ...overrides },
    isLoading: false,
    error: undefined,
    notYetSynced: false,
    mutate,
  });
}

function getInfoValue(label: string) {
  return within(screen.getByText(label).parentElement).getByText('—');
}

describe('FacilityRegistryView missing branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFacility();
  });

  it('renders the uncontracted status, coordinates, and administrator details', () => {
    render(<FacilityRegistryView />);

    expect(screen.getByText('Not contracted')).toBeVisible();
    expect(screen.getByText('-1.301, 36.805')).toBeVisible();
    expect(screen.getByText('Alice Wanjiku')).toBeVisible();
    expect(screen.getByText('+254711111111')).toBeVisible();
    expect(screen.getByText('alice@example.com')).toBeVisible();
  });

  it('renders placeholders for missing facility phone and email', () => {
    mockFacility({ facility_phone_number: undefined, facility_email: undefined });
    render(<FacilityRegistryView />);

    expect(getInfoValue('Phone')).toHaveTextContent('—');
    expect(getInfoValue('Email')).toHaveTextContent('—');
  });

  it('shows the empty bed-occupancy state when no data is available', () => {
    mockFacility({ bed_occupancy: undefined });
    render(<FacilityRegistryView />);

    expect(screen.getByText('No bed occupancy data')).toBeVisible();
  });

  it('renders string, named-object, and unnamed-object contracted services', () => {
    render(<FacilityRegistryView />);

    expect(screen.getByText('Outpatient')).toBeVisible();
    expect(screen.getByText('Maternity')).toBeVisible();
    expect(screen.getByText('{"code":"DIALYSIS"}')).toBeVisible();
  });

  it.each([
    [{ responseBody: { error: 'Registry rejected the request' } }, 'Registry rejected the request'],
    [new Error('Network unavailable'), 'Network unavailable'],
    [{}, 'Unable to reach the facility registry'],
  ])('shows the appropriate sync error message for %#', async (error, expectedSubtitle) => {
    const user = userEvent.setup();
    mockSyncFacilityRegistry.mockRejectedValue(error);
    render(<FacilityRegistryView />);

    await user.click(screen.getByRole('button', { name: 'Sync with facility registry' }));

    await waitFor(() =>
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sync failed',
          subtitle: expectedSubtitle,
          kind: 'error',
        }),
      ),
    );
    expect(mutate).not.toHaveBeenCalled();
  });
});
