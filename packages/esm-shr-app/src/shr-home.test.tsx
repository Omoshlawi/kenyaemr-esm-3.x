import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SHRHome from './shr-home.component';

describe('SHRHome', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/openmrs/spa/referrals');
  });

  it('renders the SHR home page', () => {
    render(<SHRHome />);

    expect(screen.getByText('From Community')).toBeInTheDocument();
    expect(screen.getByText('From Facility')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();

    // has pull and refer buttons
    expect(screen.getByRole('button', { name: 'Pull Referrals' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refer Patient' })).toBeInTheDocument();
  });
});
