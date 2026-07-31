import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';
import dayjs from 'dayjs';
import { openmrsFetch, useSession } from '@openmrs/esm-framework';

import ProviderBannerTag from './provider-banner.component';
import { type Attribute } from './provider-banner.resource';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockUseSession = vi.mocked(useSession);

function mockProviderResponse(attributes: Array<Attribute>, display = 'Super User') {
  mockOpenmrsFetch.mockResolvedValue({
    data: { person: { display }, attributes },
  } as unknown as Awaited<ReturnType<typeof openmrsFetch>>);
}

function licenseExpiry(value: string): Attribute {
  return { attributeType: { display: 'License Expiry Date' }, value };
}

const uniqueIdentifier: Attribute = { attributeType: { display: 'Provider unique identifier' }, value: 'HWI-001' };

function renderBanner() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <ProviderBannerTag />
    </SWRConfig>,
  );
}

describe('ProviderBannerTag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      currentProvider: { uuid: 'provider-1', identifier: 'HWI-001' },
    } as unknown as ReturnType<typeof useSession>);
  });

  it('shows an inline loading indicator while fetching', () => {
    mockOpenmrsFetch.mockReturnValue(new Promise(() => {}) as ReturnType<typeof openmrsFetch>);
    renderBanner();
    expect(screen.getByText('loading...')).toBeInTheDocument();
  });

  it('fetches the provider attributes for the session provider', async () => {
    mockProviderResponse([uniqueIdentifier]);
    renderBanner();
    await screen.findByText('SUPER USER');
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      '/ws/rest/v1/provider/provider-1?v=custom:(person:(display),attributes:(attributeType:(display),value))',
    );
  });

  it('renders the identifier, upper-cased name, and an Unlicensed tag when there is no license expiry', async () => {
    mockProviderResponse([uniqueIdentifier]);
    renderBanner();

    expect(await screen.findByText('SUPER USER')).toBeInTheDocument();
    expect(screen.getByText('HWI-001')).toBeInTheDocument();
    expect(screen.getByText('Unlicensed')).toBeInTheDocument();
  });

  it('falls back to NONE when the provider has no identifier or name', async () => {
    mockProviderResponse([], '');
    renderBanner();
    expect(await screen.findAllByText('NONE')).toHaveLength(2);
  });

  it('shows a valid license tag with the expiry date when the license lasts beyond 90 days', async () => {
    const expiry = dayjs().add(120, 'day');
    mockProviderResponse([uniqueIdentifier, licenseExpiry(expiry.toISOString())]);
    renderBanner();

    expect(await screen.findByText('Valid License')).toBeInTheDocument();
    expect(screen.getByText(expiry.format('YYYY-MM-DD'))).toBeInTheDocument();
  });

  it('shows an expires-in-3-months tag when the license expires within 90 days', async () => {
    mockProviderResponse([licenseExpiry(dayjs().add(60, 'day').toISOString())]);
    renderBanner();
    expect(await screen.findByText('Expires in 3 months')).toBeInTheDocument();
  });

  it('shows an expires-soon tag when the license expires within 30 days', async () => {
    mockProviderResponse([licenseExpiry(dayjs().add(20, 'day').toISOString())]);
    renderBanner();
    expect(await screen.findByText('Expires Soon')).toBeInTheDocument();
  });

  it('shows an expired tag when the license expiry is in the past', async () => {
    mockProviderResponse([licenseExpiry(dayjs().subtract(10, 'day').toISOString())]);
    renderBanner();
    expect(await screen.findByText('License Expired')).toBeInTheDocument();
  });

  it('renders the banner-style error tag with the error message on hover when the request fails', async () => {
    mockOpenmrsFetch.mockRejectedValue(new Error('Server unavailable'));
    renderBanner();

    expect(await screen.findByText('Error loading provider information')).toBeInTheDocument();
    expect(screen.getByText('Provider:')).toBeInTheDocument();
    expect(screen.getByTitle('Server unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Identifier:')).not.toBeInTheDocument();
  });
});
