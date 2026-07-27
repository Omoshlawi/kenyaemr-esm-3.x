import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Registration from './registration.component';

describe('Registration', () => {
  it('renders the registration dashboard and workspace', () => {
    render(<Registration />);

    expect(screen.getByText('Workspace Container')).toBeInTheDocument();
  });
});
