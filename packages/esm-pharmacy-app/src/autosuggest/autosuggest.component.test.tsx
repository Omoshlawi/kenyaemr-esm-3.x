import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Autosuggest } from './autosuggest.component';

const suggestions = [
  { uuid: 'one', display: 'Jane Doe' },
  { uuid: 'two', display: 'John Doe' },
];

const defaults = {
  id: 'entityIdentifier',
  labelText: 'Full name',
  placeholder: 'Firstname Familyname',
  getDisplayValue: (item) => item.display,
  getFieldValue: (item) => item.uuid,
  getSearchResults: vi.fn().mockResolvedValue(suggestions),
  onSuggestionSelected: vi.fn(),
};

describe('Autosuggest', () => {
  beforeEach(() => {
    defaults.getSearchResults.mockClear();
    defaults.onSuggestionSelected.mockClear();
  });

  it('searches asynchronously and selects a result', async () => {
    const user = userEvent.setup();
    render(<Autosuggest {...defaults} />);
    const input = screen.getByRole('searchbox', { name: 'Full name' });
    await user.type(input, 'Jane');
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeVisible());
    expect(defaults.getSearchResults).toHaveBeenLastCalledWith('Jane');
    await user.click(screen.getByText('Jane Doe'));
    expect(input).toHaveValue('Jane Doe');
    expect(defaults.onSuggestionSelected).toHaveBeenLastCalledWith('entityIdentifier', 'one');
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('clears a selection and does not search an empty query', async () => {
    const user = userEvent.setup();
    render(<Autosuggest {...defaults} />);
    const input = screen.getByRole('searchbox', { name: 'Full name' });
    await user.type(input, 'x');
    await screen.findByText('Jane Doe');
    await user.clear(input);
    expect(defaults.onSuggestionSelected).toHaveBeenLastCalledWith('entityIdentifier', undefined);
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('closes results after an outside click and renders validation feedback', async () => {
    render(<Autosuggest {...defaults} invalid invalidText="Required" />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Jane' } });
    await screen.findByText('Jane Doe');
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Required')).toBeVisible();
  });

  it('handles searches with no results', async () => {
    const getSearchResults = vi.fn().mockResolvedValue([]);
    render(<Autosuggest {...defaults} getSearchResults={getSearchResults} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Nobody' } });
    await waitFor(() => expect(getSearchResults).toHaveBeenCalledWith('Nobody'));
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
