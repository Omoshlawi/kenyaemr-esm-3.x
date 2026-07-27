import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Header from './header.component';

describe('Header', () => {
  it('renders the reports page title and facility illustration', () => {
    render(<Header />);

    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('FacilityPictogram')).toBeInTheDocument();
  });
});
