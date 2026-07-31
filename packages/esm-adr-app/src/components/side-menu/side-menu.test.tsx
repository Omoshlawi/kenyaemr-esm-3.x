import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LeftNavMenu } from '@openmrs/esm-framework';
import SideMenu from './side-menu.component';

describe('SideMenu', () => {
  it('renders the left navigation menu', () => {
    render(<SideMenu />);

    expect(LeftNavMenu).toHaveBeenCalled();
    expect(screen.getByText('Left Nav Menu')).toBeInTheDocument();
  });
});
