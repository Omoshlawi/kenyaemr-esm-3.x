import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, beforeEach, expect } from 'vitest';

import FrontendModule from './frontend-modules.component';

describe('FrontendModule', () => {
  beforeEach(() => {
    window.installedModules = [];
  });

  it('renders table headers for module name and version', () => {
    window.installedModules = [['@openmrs/test-module', { version: '1.0.0' }]];

    render(<FrontendModule />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /module name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /version/i })).toBeInTheDocument();
  });

  it('renders a row for each frontend module with name and version', () => {
    window.installedModules = [
      ['@openmrs/Module A', { version: '1.0.0' }],
      ['@openmrs/Module B', { version: '2.0.0' }],
    ];

    render(<FrontendModule />);

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');

    // First row is the header; data rows follow
    const dataRows = rows.slice(1);
    expect(dataRows).toHaveLength(2);

    expect(within(dataRows[0]).getByText('Module A')).toBeInTheDocument();
    expect(within(dataRows[0]).getByText('1.0.0')).toBeInTheDocument();

    expect(within(dataRows[1]).getByText('Module B')).toBeInTheDocument();
    expect(within(dataRows[1]).getByText('2.0.0')).toBeInTheDocument();
  });

  it('falls back to "No version found" when version is missing', () => {
    window.installedModules = [['@openmrs/No Version Module', {}]];

    render(<FrontendModule />);

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    const dataRow = rows[1];

    expect(within(dataRow).getByText('No version found')).toBeInTheDocument();
  });
});
