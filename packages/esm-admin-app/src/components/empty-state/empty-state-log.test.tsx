import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi, describe, it, expect } from 'vitest';
import EmptyState from './empty-state-log.components';
import React from 'react';

vi.mock('@openmrs/esm-patient-common-lib', () => ({
  EmptyDataIllustration: vi.fn(() => <div>Mocked EmptyDataIllustration</div>),
}));

describe('EmptyState', () => {
  it('renders the EmptyState component with the given subtitle', () => {
    const testSubtitle = 'No data available';

    render(<EmptyState subTitle={testSubtitle} />);

    const subtitleElement = screen.getByText(testSubtitle);
    expect(subtitleElement).toBeInTheDocument();

    const illustrationElement = screen.getByText('Mocked EmptyDataIllustration');
    expect(illustrationElement).toBeInTheDocument();
  });
});
