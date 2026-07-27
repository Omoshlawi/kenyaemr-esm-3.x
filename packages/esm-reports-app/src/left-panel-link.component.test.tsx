import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLeftPanelLink } from './left-panel-link.component';

const renderAt = (pathname: string, ...args: Parameters<typeof createLeftPanelLink>) => {
  window.history.pushState({}, '', pathname);
  const Link = createLeftPanelLink(...args);
  return render(<Link />);
};

describe('createLeftPanelLink', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('links the base reports item to the reporting root', () => {
    renderAt('/', { name: 'reports', title: 'Reports', icon: 'omrs-icon-report' });

    expect(screen.getByRole('link')).toHaveAttribute('href', '/openmrs/spa/reporting');
  });

  it('marks the base reports item active on a report detail route', () => {
    renderAt('/openmrs/spa/reporting/report/abc-123', { name: 'reports', title: 'Reports' });

    expect(screen.getByRole('link')).toHaveClass('active-left-nav-link');
  });

  it('does not mark the base reports item active on the history route', () => {
    renderAt('/openmrs/spa/reporting/reports-history', { name: 'reports', title: 'Reports' });

    expect(screen.getByRole('link')).not.toHaveClass('active-left-nav-link');
  });

  it('marks a named item active on its own nested route', () => {
    renderAt('/openmrs/spa/reporting/reports-history/details', {
      name: 'reports-history',
      title: 'History',
    });

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/openmrs/spa/reporting/reports-history');
    expect(link).toHaveClass('active-left-nav-link');
  });
});
