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

  it('links to the spa root instead of the reporting root when useBaseReportsPath is false', () => {
    renderAt('/', {
      name: 'report-builder',
      title: 'Builder',
      useBaseReportsPath: false,
    });

    expect(screen.getByRole('link')).toHaveAttribute('href', '/openmrs/spa/report-builder');
  });

  it('normalizes duplicate slashes in the target path', () => {
    renderAt('/', {
      name: 'report-builder',
      title: 'Builder',
      useBaseReportsPath: false,
    });

    // With useBaseReportsPath false the base ends in a slash and the name adds
    // another, so the collapsed href must not contain "//".
    expect(screen.getByRole('link').getAttribute('href')).not.toMatch(/[^:]\/\//);
  });

  it('marks a non-reporting item active on its own nested route', () => {
    renderAt('/openmrs/spa/report-builder/new', {
      name: 'report-builder',
      title: 'Builder',
      useBaseReportsPath: false,
    });

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/openmrs/spa/report-builder');
    expect(link).toHaveClass('active-left-nav-link');
  });

  it('does not mark a non-reporting item active on an unrelated route', () => {
    renderAt('/openmrs/spa/reporting', {
      name: 'report-builder',
      title: 'Builder',
      useBaseReportsPath: false,
    });

    expect(screen.getByRole('link')).not.toHaveClass('active-left-nav-link');
  });
});
