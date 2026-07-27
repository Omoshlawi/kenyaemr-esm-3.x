import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar } from '@openmrs/esm-framework';
import { mutate } from 'swr';
import { fetchPerson, fetchUser, saveMapping } from '../pharmacy.resources';
import PharmacyAssignmentForm from './pharamacy-assignment-form.workspace';

vi.mock('swr', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  mutate: vi.fn(),
}));
vi.mock('../pharmacy.resources', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  fetchPerson: vi.fn(),
  fetchUser: vi.fn(),
  saveMapping: vi.fn(),
}));
vi.mock('../autosuggest/autosuggest.component', () => ({
  Autosuggest: (props) => (
    <div>
      <span>{props.labelText}</span>
      {props.invalid && <span>{props.invalidText}</span>}
      <button type="button" onClick={() => props.onSuggestionSelected('entityIdentifier', 'selected-uuid')}>
        Select result
      </button>
      <button type="button" onClick={() => props.onClear()}>
        Clear result
      </button>
      <button type="button" onClick={() => props.getSearchResults('query')}>
        Search entity
      </button>
      <span data-testid="display">
        {props.getDisplayValue(
          props.placeholderEntity ?? { display: 'Patient Display', person: { display: 'User Display' } },
        )}
      </span>
    </div>
  ),
}));

const workspaceProps = {
  closeWorkspace: vi.fn(),
  closeWorkspaceWithSavedChanges: vi.fn(),
  promptBeforeClosing: vi.fn(),
  pharmacyUuid: 'pharmacy-1',
} as any;

describe('PharmacyAssignmentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPerson).mockResolvedValue([]);
    vi.mocked(fetchUser).mockResolvedValue([]);
  });

  it('selects a patient and submits the correct mapping', async () => {
    const user = userEvent.setup();
    vi.mocked(saveMapping).mockResolvedValue('Mapping saved');
    render(<PharmacyAssignmentForm {...workspaceProps} type="org.openmrs.Patient" />);
    expect(screen.getByTestId('display')).toHaveTextContent('Patient Display');
    await user.click(screen.getByRole('button', { name: 'Search entity' }));
    expect(fetchPerson).toHaveBeenCalledWith('query', expect.any(AbortController));
    await user.click(screen.getByRole('button', { name: 'Select result' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      expect(saveMapping).toHaveBeenCalledWith({
        basisIdentifier: 'pharmacy-1',
        basisType: 'org.openmrs.Location',
        entityIdentifier: 'selected-uuid',
        entityType: 'org.openmrs.Patient',
      }),
    );
    expect(showSnackbar).toHaveBeenCalledWith({
      kind: 'success',
      subtitle: 'Mapping saved',
      title: 'Success',
    });
    expect(workspaceProps.closeWorkspace).toHaveBeenCalled();
    const matcher = vi.mocked(mutate).mock.calls[0][0] as (key: unknown) => boolean;
    expect(matcher('/ws/rest/v1/datafilter/search?type=org.openmrs.Patient')).toBe(true);
    expect(matcher({})).toBe(false);
  });

  it('switches to user search and submits a user assignment', async () => {
    const user = userEvent.setup();
    vi.mocked(saveMapping).mockResolvedValue('saved');
    render(<PharmacyAssignmentForm {...workspaceProps} type="org.openmrs.Patient" />);
    await user.click(screen.getByLabelText('User'));
    expect(screen.getByTestId('display')).toHaveTextContent('User Display');
    await user.click(screen.getByRole('button', { name: 'Search entity' }));
    expect(fetchUser).toHaveBeenCalledWith('query', expect.any(AbortController));
    await user.click(screen.getByRole('button', { name: 'Select result' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      expect(saveMapping).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'org.openmrs.User' })),
    );
  });

  it('shows required validation and allows discard', async () => {
    const user = userEvent.setup();
    render(<PharmacyAssignmentForm {...workspaceProps} type="org.openmrs.User" />);
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Required')).toBeVisible();
    expect(saveMapping).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(workspaceProps.closeWorkspace).toHaveBeenCalled();
  });

  it('retains the workspace and reports an API failure', async () => {
    const user = userEvent.setup();
    vi.mocked(saveMapping).mockRejectedValue(new Error('Server unavailable'));
    render(<PharmacyAssignmentForm {...workspaceProps} type="org.openmrs.User" />);
    await user.click(screen.getByRole('button', { name: 'Select result' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      expect(showSnackbar).toHaveBeenCalledWith({
        kind: 'error',
        subtitle: 'Server unavailable',
        title: 'Failure',
        isLowContrast: true,
      }),
    );
    expect(workspaceProps.closeWorkspace).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });
});
