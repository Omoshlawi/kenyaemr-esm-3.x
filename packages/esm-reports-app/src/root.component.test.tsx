import React from 'react';
import { render, screen } from '@testing-library/react';
import { useLeftNav } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportDashboard from './root.component';

const mockUseLeftNav = vi.mocked(useLeftNav);

describe('ReportDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/openmrs/spa/reporting');
  });

  it('registers the reports left nav and renders the shell for the index route', () => {
    render(<ReportDashboard />);

    expect(mockUseLeftNav).toHaveBeenCalledWith(expect.objectContaining({ name: 'reports-left-panel-slot' }));

    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Loading reports...')).toBeInTheDocument();
  });
});
