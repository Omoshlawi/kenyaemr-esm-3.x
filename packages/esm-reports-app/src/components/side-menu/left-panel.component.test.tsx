import React from 'react';
import { render, screen } from '@testing-library/react';
import { useLayoutType } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LeftPanel from './left-panel.component';

const mockUseLayoutType = vi.mocked(useLayoutType);

describe('LeftPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLayoutType.mockReturnValue('large-desktop');
  });

  it('renders the reports side navigation on desktop', () => {
    render(<LeftPanel />);

    expect(screen.getByRole('navigation', { name: 'Reports left panel' })).toBeInTheDocument();
  });

  it('renders nothing on a tablet layout', () => {
    mockUseLayoutType.mockReturnValue('tablet');

    const { container } = render(<LeftPanel />);

    expect(container).toBeEmptyDOMElement();
  });
});
