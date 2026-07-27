import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDatetime, openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { SWRConfig } from 'swr';

import About from './about.component';

describe('About', () => {
  const useConfigMock = vi.mocked(useConfig);
  const moduleResponse = [{ uuid: 'kenyaemr', name: 'KenyaEMR', version: '3.2.1' }];

  function renderAbout(facilityValue: unknown, modules = moduleResponse) {
    vi.mocked(openmrsFetch).mockImplementation(async (url) => {
      if (url === 'ws/rest/v1/module?v=custom:(uuid,name,version)') {
        return { data: { results: modules } };
      }

      if (url === '/ws/rest/v1/systemsetting?q=kenyaemr.cashier.receipt.facilityInformation&v=full') {
        return {
          data: {
            results: facilityValue === undefined ? [] : [{ value: facilityValue }],
          },
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    return render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <About />
      </SWRConfig>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    useConfigMock.mockReturnValue({ defaultLogoPath: '/default-logo.png' });
    window.installedModules = [];
  });

  it('shows a loading state while facility information is loading', () => {
    vi.mocked(openmrsFetch).mockImplementation(() => new Promise(() => {}));

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <About />
      </SWRConfig>,
    );

    expect(screen.getByText('Loading facility information...')).toBeInTheDocument();
  });

  it('renders configured facility details, contacts, and versions from an object value', async () => {
    const expectedBuildDate = formatDatetime(new Date('2026-06-24T05:31:32.682Z'), { mode: 'standard' });
    renderAbout({
      facilityName: 'Lake Clinic',
      tagline: 'Care close to home',
      contacts: {
        tel: '0700 000 000',
        email: 'hello@lake.test',
        emergency: '0711 111 111',
        address: 'Kisumu',
        website: 'lake.test',
      },
    });

    expect(await screen.findByRole('heading', { name: 'Lake Clinic' })).toBeInTheDocument();
    expect(screen.getByText('Care close to home')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Lake Clinic' })).toHaveAttribute('src', '/default-logo.png');
    expect(screen.getByText('0700 000 000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'hello@lake.test' })).toHaveAttribute('href', 'mailto:hello@lake.test');
    expect(screen.getByText(/Emergency.*0711 111 111/)).toBeInTheDocument();
    expect(screen.getByText('Kisumu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'lake.test' })).toHaveAttribute('href', 'https://lake.test');
    expect(screen.getByText('v3.2.1')).toBeInTheDocument();
    expect(screen.getByText('v5.4.3')).toBeInTheDocument();
    expect(screen.getByText(expectedBuildDate)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Module name' })).toBeInTheDocument();
  });

  it('parses string settings and preserves absolute website URLs', async () => {
    renderAbout(
      JSON.stringify({
        facilityName: 'Coast Hospital',
        contacts: { website: 'http://coast.test' },
      }),
    );

    expect(await screen.findByRole('link', { name: 'http://coast.test' })).toHaveAttribute('href', 'http://coast.test');
  });

  it.each([undefined, 'not json', 42, []])('uses fallback details for invalid setting value %p', async (value) => {
    renderAbout(value, []);

    expect(await screen.findByRole('heading', { name: 'Ministry of Health' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Facility logo' })).toBeInTheDocument();
    expect(screen.getByText('v—')).toBeInTheDocument();
  });

  it('omits empty optional facility sections', async () => {
    renderAbout({ facilityName: 'Plain Clinic', contacts: {} });

    expect(await screen.findByRole('heading', { name: 'Plain Clinic' })).toBeInTheDocument();
    expect(screen.queryByText('Emergency')).not.toBeInTheDocument();
  });
});
