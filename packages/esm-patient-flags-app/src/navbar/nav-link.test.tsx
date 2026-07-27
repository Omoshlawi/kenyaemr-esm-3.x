import React, { type PropsWithChildren } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type FetchResponse, navigate, openmrsFetch, type Session, useSession } from '@openmrs/esm-framework';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NavBarLink from './navbar-link.component';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  navigate: vi.fn(),
  openmrsFetch: vi.fn(),
  useSession: vi.fn(),
}));

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockUseSession = vi.mocked(useSession);
const mockNavigate = vi.mocked(navigate);

const mockProps = {
  icon: <div>Icon</div>,
  label: 'Test Label',
  url: 'https://example.com',
  hideOverlay: vi.fn(),
  onClick: vi.fn(),
};

const TestWrapper = ({ children }: PropsWithChildren) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

type FacilityStatus = {
  sha_operational_status?: string;
  regulatory_operational_status?: string;
};

function respondWithFacility(facility: FacilityStatus) {
  mockOpenmrsFetch.mockResolvedValue({
    status: 200,
    statusText: 'OK',
    data: facility,
  } as FetchResponse<FacilityStatus>);
}

function renderNavBarLink(props: Partial<React.ComponentProps<typeof NavBarLink>> = {}) {
  return render(<NavBarLink {...mockProps} {...props} />, { wrapper: TestWrapper });
}

function getNavButton(label = /Test Label/) {
  return screen.getByRole('button', { name: label });
}

describe('<NavBarLink />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({ authenticated: true, sessionId: '123' } as Session);
  });

  it('shows a healthy System Info item when both operational statuses are active', async () => {
    respondWithFacility({
      sha_operational_status: ' active ',
      regulatory_operational_status: 'Active',
    });

    renderNavBarLink({ label: 'System Info' });

    expect(await screen.findByText('Facility is active and operational')).toBeInTheDocument();
    expect(screen.queryByText(/operational status is not active/)).not.toBeInTheDocument();
  });

  it('treats missing operational statuses as healthy when facility data is available', async () => {
    respondWithFacility({});

    renderNavBarLink({ label: 'System Info' });

    expect(await screen.findByText('Facility is active and operational')).toBeInTheDocument();
  });

  it.each([
    {
      name: 'SHA',
      facility: { sha_operational_status: 'INACTIVE', regulatory_operational_status: 'ACTIVE' },
      message: 'SHA operational status is not active',
    },
    {
      name: 'regulatory',
      facility: { sha_operational_status: 'ACTIVE', regulatory_operational_status: 'SUSPENDED' },
      message: 'Regulatory operational status is not active',
    },
  ])('shows a warning when the $name operational status is not active', async ({ facility, message }) => {
    respondWithFacility(facility);
    renderNavBarLink({ label: 'System Info' });

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText('Facility is active and operational')).not.toBeInTheDocument();
  });

  it('lists both issues when neither operational status is active', async () => {
    respondWithFacility({
      sha_operational_status: 'INACTIVE',
      regulatory_operational_status: 'SUSPENDED',
    });
    renderNavBarLink({ label: 'System Info' });

    const tooltip = await screen.findByRole('tooltip', { hidden: true });
    expect(tooltip).toHaveTextContent('SHA operational status is not active');
    expect(tooltip).toHaveTextContent('Regulatory operational status is not active');
  });

  it('shows no status indicator before facility data is available', () => {
    mockOpenmrsFetch.mockReturnValue(new Promise(() => {}) as never);

    renderNavBarLink({ label: 'System Info' });

    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });

  it('shows no status indicator when the facility has not yet synced', async () => {
    mockOpenmrsFetch.mockRejectedValue({ response: { status: 404 } });

    renderNavBarLink({ label: 'System Info' });

    await waitFor(() => expect(mockOpenmrsFetch).toHaveBeenCalled());
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });

  it('does not fetch or show a status indicator for an unauthenticated user', () => {
    mockUseSession.mockReturnValue({ authenticated: false } as Session);

    renderNavBarLink({ label: 'System Info' });

    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });

  it('does not decorate ordinary navigation items with facility status', async () => {
    respondWithFacility({
      sha_operational_status: 'INACTIVE',
      regulatory_operational_status: 'SUSPENDED',
    });

    renderNavBarLink();

    await waitFor(() => expect(mockOpenmrsFetch).toHaveBeenCalled());
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
  });

  it('closes the overlay and navigates when a URL item is clicked', async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({ authenticated: false } as Session);
    renderNavBarLink();

    await user.click(getNavButton());

    expect(mockProps.hideOverlay).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith({ to: mockProps.url });
    expect(mockProps.onClick).not.toHaveBeenCalled();
  });

  it('closes the overlay and invokes the callback when the item has no URL', async () => {
    const user = userEvent.setup();
    mockUseSession.mockReturnValue({ authenticated: false } as Session);
    renderNavBarLink({ url: undefined });

    await user.click(getNavButton());

    expect(mockProps.hideOverlay).toHaveBeenCalledWith(false);
    expect(mockProps.onClick).toHaveBeenCalledOnce();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
