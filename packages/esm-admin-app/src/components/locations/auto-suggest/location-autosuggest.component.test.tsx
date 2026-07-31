import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchLocation } from '../hooks/UseFacilityLocations';
import { type LocationResponse } from '../types';
import { LocationAutosuggest } from './location-autosuggest.component';

vi.mock('../hooks/UseFacilityLocations', () => ({
  searchLocation: vi.fn(),
}));

const locations: Array<LocationResponse> = [
  {
    uuid: 'location-1',
    display: 'Mbagathi Hospital',
    name: 'Mbagathi',
    description: 'County hospital',
    stateProvince: 'Nairobi',
    country: 'Kenya',
    countyDistrict: '',
    address5: '',
    address6: '',
    tags: [],
    attributes: [],
  },
];

const mockSearchLocation = vi.mocked(searchLocation);

describe('LocationAutosuggest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchLocation.mockResolvedValue(locations);
  });

  it('searches for locations and returns the selected location', async () => {
    const user = userEvent.setup();
    const onLocationSelected = vi.fn();
    render(<LocationAutosuggest onLocationSelected={onLocationSelected} />);

    await user.type(screen.getByRole('searchbox', { name: 'Select Location' }), 'Mbagathi');

    expect(await screen.findByText('Mbagathi Hospital')).toBeVisible();
    expect(mockSearchLocation).toHaveBeenLastCalledWith('Mbagathi');

    await user.click(screen.getByText('Mbagathi Hospital'));
    expect(onLocationSelected).toHaveBeenCalledWith('location-1', locations[0]);
  });

  it('supports custom input and validation labels', () => {
    render(
      <LocationAutosuggest
        onLocationSelected={vi.fn()}
        labelText="Facility"
        placeholder="Find a facility"
        invalid
        invalidText="Facility is required"
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Facility' })).toHaveAttribute('placeholder', 'Find a facility');
    expect(screen.getByText('Facility is required')).toBeVisible();
  });

  it('shows an empty state when a search has no matches', async () => {
    const user = userEvent.setup();
    mockSearchLocation.mockResolvedValue([]);
    render(<LocationAutosuggest onLocationSelected={vi.fn()} />);

    await user.type(screen.getByRole('searchbox', { name: 'Select Location' }), 'Unknown');

    expect(await screen.findByText('Found no matching results')).toBeVisible();
    expect(screen.getByText('Try searching for a different term')).toBeVisible();
  });
});
