import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Autosuggest } from './autosuggest.component';

const suggestions = [
  { uuid: 'location-1', display: 'Mbagathi Hospital' },
  { uuid: 'location-2', display: 'Kenyatta National Hospital' },
];

const defaultProps = {
  id: 'location',
  labelText: 'Location',
  placeholder: 'Search locations',
  getDisplayValue: (item) => item.display,
  getFieldValue: (item) => item.uuid,
  getSearchResults: vi.fn().mockResolvedValue(suggestions),
  onSuggestionSelected: vi.fn(),
};

describe('Autosuggest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.getSearchResults.mockResolvedValue(suggestions);
  });

  it('searches with a trimmed query and selects a suggestion', async () => {
    const user = userEvent.setup();
    render(<Autosuggest {...defaultProps} />);

    const input = screen.getByRole('searchbox', { name: 'Location' });
    await user.type(input, '  Mbagathi  ');

    expect(await screen.findByText('Mbagathi Hospital')).toBeVisible();
    expect(defaultProps.getSearchResults).toHaveBeenLastCalledWith('Mbagathi');

    await user.click(screen.getByText('Mbagathi Hospital'));

    expect(input).toHaveValue('Mbagathi Hospital');
    expect(defaultProps.onSuggestionSelected).toHaveBeenLastCalledWith('location', 'location-1');
    expect(screen.queryByText('Kenyatta National Hospital')).not.toBeInTheDocument();
  });

  it('clears suggestions without searching a blank query', async () => {
    const user = userEvent.setup();
    render(<Autosuggest {...defaultProps} />);

    const input = screen.getByRole('searchbox', { name: 'Location' });
    await user.type(input, 'M');
    await screen.findByText('Mbagathi Hospital');
    await user.clear(input);

    expect(defaultProps.onSuggestionSelected).toHaveBeenLastCalledWith('location', undefined);
    expect(defaultProps.getSearchResults).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Mbagathi Hospital')).not.toBeInTheDocument();
  });

  it('closes results on an outside click and displays validation feedback', async () => {
    render(<Autosuggest {...defaultProps} invalid invalidText="Select a valid location" />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Mbagathi' } });
    await screen.findByText('Mbagathi Hospital');
    fireEvent.mouseDown(document.body);

    expect(screen.queryByText('Mbagathi Hospital')).not.toBeInTheDocument();
    expect(screen.getByText('Select a valid location')).toBeVisible();
  });

  it('renders a custom empty state when no suggestions are returned', async () => {
    defaultProps.getSearchResults.mockResolvedValue([]);
    render(<Autosuggest {...defaultProps} renderEmptyState={(value) => <div>No locations found for {value}</div>} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Unknown' } });

    expect(await screen.findByText('No locations found for Unknown')).toBeVisible();
  });

  it('stops loading and clears suggestions when a search fails', async () => {
    defaultProps.getSearchResults.mockRejectedValue(new Error('Request failed'));
    render(<Autosuggest {...defaultProps} renderEmptyState={(value) => <div>No locations found for {value}</div>} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Unknown' } });
    expect(screen.getByText('Loading...')).toBeVisible();

    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    expect(screen.getByText('No locations found for Unknown')).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
