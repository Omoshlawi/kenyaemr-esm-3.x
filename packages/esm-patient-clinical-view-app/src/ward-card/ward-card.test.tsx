import React from 'react';
import { describe, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import WardCard from './ward-card.component';

const testProps = {
  label: 'Available beds',
  value: 'A00-001',
  headerLabel: 'Hospital Bed',
};

describe('WardCard', () => {
  it('renders the header, label, value, and children', () => {
    render(
      <WardCard {...testProps}>
        <div>Child component details</div>
      </WardCard>,
    );

    expect(screen.getByText(testProps.label)).toBeInTheDocument();
    expect(screen.getByText(testProps.value)).toBeInTheDocument();
    expect(screen.getByText(testProps.headerLabel)).toBeInTheDocument();
    expect(screen.getByText('Child component details')).toBeInTheDocument();
  });

  it('renders without children and supports a numeric value', () => {
    render(<WardCard {...testProps} value={12} />);

    expect(screen.getByText(testProps.headerLabel)).toBeInTheDocument();
    expect(screen.getByText(testProps.label)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.queryByText('Child component details')).not.toBeInTheDocument();
  });
});
