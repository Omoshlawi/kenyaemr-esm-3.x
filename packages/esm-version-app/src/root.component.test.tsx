import React from 'react';
import { render, screen } from '@testing-library/react';
import { openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import Root, { spaRoot } from './root.component';

describe('Root', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockReturnValue({ defaultLogoPath: '/default-logo.png' });
    vi.mocked(openmrsFetch).mockImplementation(async (url) => {
      if (url === 'ws/rest/v1/module?v=custom:(uuid,name,version)') {
        return {
          data: {
            results: [{ uuid: 'kenyaemr', name: 'KenyaEMR', version: '3.2.1' }],
          },
        };
      }

      if (url === '/ws/rest/v1/systemsetting?q=kenyaemr.cashier.receipt.facilityInformation&v=full') {
        return {
          data: {
            results: [{ value: { facilityName: 'Lake Clinic' } }],
          },
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    });
    window.installedModules = [];
    window.history.pushState({}, '', spaRoot);
  });

  it('renders the system information page under the configured SPA base', async () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <Root />
      </SWRConfig>,
    );

    expect(spaRoot).toBe('/openmrs/spa/');
    expect(await screen.findByRole('heading', { name: 'Lake Clinic' })).toBeInTheDocument();
    expect(screen.getByText('Main Module Version')).toBeInTheDocument();
    expect(screen.getByText('v3.2.1')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Module name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Version' })).toBeInTheDocument();
  });
});
