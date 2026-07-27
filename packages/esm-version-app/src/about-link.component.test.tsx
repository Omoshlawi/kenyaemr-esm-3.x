import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AboutLink from './about-link.component';

describe('AboutLink', () => {
  it('links to the system information page', () => {
    render(<AboutLink />);

    expect(screen.getByRole('link', { name: 'System Info' })).toHaveAttribute('href', '/openmrs/spa/about');
  });
});
