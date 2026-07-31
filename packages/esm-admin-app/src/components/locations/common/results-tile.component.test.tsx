import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { type LocationResponse } from '../types';
import ResultsTile from './results-tile.component';

const location: LocationResponse = {
  uuid: 'location-1',
  display: 'Mbagathi Hospital',
  name: 'Mbagathi',
  description: 'County hospital',
  stateProvince: 'Nairobi',
  country: 'Kenya',
  countyDistrict: '',
  address5: '',
  address6: '',
  tags: [
    { uuid: 'tag-1', display: 'Facility', name: 'Facility', description: '' },
    { uuid: 'tag-2', display: '', name: 'Clinical location', description: '' },
  ],
  attributes: [],
};

describe('ResultsTile', () => {
  it('renders the location details and tags', () => {
    render(<ResultsTile location={location} />);

    expect(screen.getByText('Mbagathi Hospital')).toBeVisible();
    expect(screen.getByText('County hospital')).toBeVisible();
    expect(screen.getByText('Nairobi, Kenya')).toBeVisible();
    expect(screen.getByText('Facility')).toBeVisible();
    expect(screen.getByText('Clinical location')).toBeVisible();
  });

  it('falls back to the location and tag names and omits missing optional details', () => {
    render(
      <ResultsTile
        location={{
          ...location,
          display: '',
          description: '',
          stateProvince: '',
          country: '',
          tags: [{ uuid: 'tag-1', display: '', name: 'Ward', description: '' }],
        }}
      />,
    );

    expect(screen.getByText('Mbagathi')).toBeVisible();
    expect(screen.getByText('Ward')).toBeVisible();
    expect(screen.queryByText('County hospital')).not.toBeInTheDocument();
    expect(screen.queryByText('Nairobi, Kenya')).not.toBeInTheDocument();
  });

  it('calls onClose when the close icon is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<ResultsTile location={location} onClose={onClose} />);

    await user.click(container.querySelector('svg'));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
