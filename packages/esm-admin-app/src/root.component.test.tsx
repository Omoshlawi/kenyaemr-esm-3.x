import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { openmrsFetch as apiOpenmrsFetch } from '@openmrs/esm-api';
import {
  getDefaultsFromConfigSchema,
  launchWorkspace2,
  showModal,
  showSnackbar,
  useConfig,
  useLeftNav,
} from '@openmrs/esm-framework';

import { configSchema } from './config-schema';
import {
  allFetchCalls,
  allFetchUrls,
  defaultRoutes,
  facilityRegistryFixture,
  installFetchDispatcher,
  renderAdminApp,
} from './testing/openmrs-fetch-mock';

// Network boundary: the real framework hooks running inside the official mock
// (useFhirFetchAll, useOpenmrsPagination) fetch through @openmrs/esm-api directly,
// so that instance is spied here; app-level hooks go through the framework mock's
// own openmrsFetch spy. installFetchDispatcher wires both to one dispatcher.
vi.mock('@openmrs/esm-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-api')>()),
  openmrsFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiOpenmrsFetch);
const mockShowModal = vi.mocked(showModal);
const mockShowSnackbar = vi.mocked(showSnackbar);
const mockLaunchWorkspace2 = vi.mocked(launchWorkspace2);

describe('Root', () => {
  const user = userEvent.setup({ delay: null });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useConfig).mockReturnValue(getDefaultsFromConfigSchema(configSchema));
    mockShowModal.mockReturnValue(vi.fn());
    installFetchDispatcher(apiFetchMock, defaultRoutes());
  });

  describe('shell and routing', () => {
    it('registers the left nav and renders the user management landing page at /', async () => {
      renderAdminApp('/');
      expect(useLeftNav).toHaveBeenCalledWith({ name: 'admin-left-panel-slot', basePath: '/spa' });
      expect(await screen.findByText('User Management')).toBeInTheDocument();
    });

    it('renders the global property dashboard at /global-property', async () => {
      renderAdminApp('/global-property');
      expect(await screen.findByText('setting.one')).toBeInTheDocument();
      expect(allFetchUrls(apiFetchMock)).toEqual(
        expect.arrayContaining([expect.stringContaining('systemsetting?v=default&limit=10')]),
      );
    });
  });

  describe('/user-management', () => {
    it('loads users and providers and renders them in the provider list table', async () => {
      renderAdminApp('/user-management');
      expect(await screen.findByRole('table', { name: 'Provider list' })).toBeInTheDocument();

      expect(screen.getByText('ALICE WANJIKU')).toBeInTheDocument();
      expect(screen.getByText('BOB OTIENO')).toBeInTheDocument();
      expect(screen.getByText('CAROL AKINYI')).toBeInTheDocument();
      expect(screen.getByText('A123')).toBeInTheDocument();
      expect(screen.getByText('B456')).toBeInTheDocument();

      const urls = allFetchUrls(apiFetchMock);
      expect(urls).toEqual(expect.arrayContaining([expect.stringContaining('/ws/rest/v1/user?v=custom')]));
      expect(urls).toEqual(expect.arrayContaining([expect.stringContaining('/ws/rest/v1/provider?v=custom')]));
      expect(urls).toEqual(
        expect.arrayContaining([expect.stringContaining('systemsetting?q=kenyaemr.userRole.config')]),
      );
    });

    it('filters users by name through the search box', async () => {
      renderAdminApp('/user-management');
      await screen.findByText('ALICE WANJIKU');

      await user.type(screen.getByPlaceholderText('Search for user'), 'alice');
      expect(screen.getByText('ALICE WANJIKU')).toBeInTheDocument();
      expect(screen.queryByText('BOB OTIENO')).not.toBeInTheDocument();

      await user.clear(screen.getByPlaceholderText('Search for user'));
      await user.type(screen.getByPlaceholderText('Search for user'), 'zzz');
      expect(await screen.findByText('No matching users found')).toBeInTheDocument();
    });

    it('filters to expired licensed users via the filter dropdown', async () => {
      renderAdminApp('/user-management');
      await screen.findByText('ALICE WANJIKU');

      await user.click(screen.getByRole('combobox'));
      await user.click(await screen.findByRole('option', { name: 'Expired Licensed' }));

      expect(screen.getByText('BOB OTIENO')).toBeInTheDocument();
      expect(screen.queryByText('ALICE WANJIKU')).not.toBeInTheDocument();
      expect(screen.queryByText('CAROL AKINYI')).not.toBeInTheDocument();
    });

    it('launches the manage-user workspace from the Add User button', async () => {
      renderAdminApp('/user-management');
      await screen.findByText('ALICE WANJIKU');

      await user.click(screen.getByRole('button', { name: /add user/i }));
      expect(mockLaunchWorkspace2).toHaveBeenCalledWith(
        'manage-user-workspace',
        expect.objectContaining({ workspaceTitle: 'Add user' }),
        {},
        {},
      );
    });

    it('opens the edit workspace from the row actions menu', async () => {
      renderAdminApp('/user-management');
      await screen.findByText('ALICE WANJIKU');

      const menus = screen.getAllByRole('button', { name: 'Options' });
      expect(menus).toHaveLength(3);

      await user.click(menus[0]);
      await user.click(await screen.findByText('Edit user'));
      expect(mockLaunchWorkspace2).toHaveBeenCalledWith(
        'manage-user-workspace',
        expect.objectContaining({ initialUserValue: expect.objectContaining({ uuid: 'user-1' }) }),
        {},
        {},
      );
    });

    it('opens the HWR sync modal for a provider with a national ID', async () => {
      renderAdminApp('/user-management');
      await screen.findByText('ALICE WANJIKU');

      await user.click(screen.getAllByRole('button', { name: 'Options' })[0]);
      await user.click(await screen.findByText('Sync'));
      expect(mockShowModal).toHaveBeenCalledWith(
        'hwr-syncing-modal',
        expect.objectContaining({ provider: expect.objectContaining({ uuid: 'provider-1' }) }),
      );
    });

    it('launches the role scope workspace for a user with an inventory role', async () => {
      renderAdminApp('/user-management');
      await screen.findByText('ALICE WANJIKU');

      await user.click(screen.getAllByRole('button', { name: 'Options' })[0]);
      await user.click(await screen.findByText('Manage user role scope'));
      expect(mockLaunchWorkspace2).toHaveBeenCalledWith(
        'user-role-scope-workspace',
        expect.objectContaining({ user: expect.objectContaining({ uuid: 'user-1' }) }),
        {},
        {},
      );
    });

    it('disables sync and role scope for a user without identifiers or inventory roles', async () => {
      renderAdminApp('/user-management');
      await screen.findByText('ALICE WANJIKU');

      // Carol has no provider attributes and no inventory role
      await user.click(screen.getAllByRole('button', { name: 'Options' })[2]);
      const sync = await screen.findByText('Sync');
      expect(sync.closest('button')).toBeDisabled();
      expect(screen.getByText('Manage user role scope').closest('button')).toBeDisabled();
    });

    it('shows user details with the license status when a row is expanded', async () => {
      renderAdminApp('/user-management');
      await screen.findByText('ALICE WANJIKU');

      await user.click(screen.getAllByRole('button', { name: /expand current row/i })[0]);
      expect(await screen.findByText('Patient Photo')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows the empty state when there are no users', async () => {
      installFetchDispatcher(apiFetchMock, [
        { match: '/ws/rest/v1/user?v=', response: { data: { results: [] } } },
        { match: '/ws/rest/v1/provider?v=', response: { data: { results: [] } } },
        ...defaultRoutes(),
      ]);
      renderAdminApp('/user-management');
      expect(await screen.findByText('No users available')).toBeInTheDocument();
    });

    it('shows the error state when the users request fails', async () => {
      installFetchDispatcher(apiFetchMock, [
        { match: '/ws/rest/v1/user?v=', error: new Error('Server error') },
        ...defaultRoutes(),
      ]);
      renderAdminApp('/user-management');
      expect(await screen.findByText('Error State')).toBeInTheDocument();
    });
  });

  describe('/etl-administration', () => {
    it('renders the ETL dashboard without firing any operation on mount', async () => {
      renderAdminApp('/etl-administration');
      expect(await screen.findByText('ETL Administration')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ETL operations' })).toBeInTheDocument();
      expect(allFetchUrls(apiFetchMock).some((url) => url.includes('kemrchart'))).toBe(false);
    });

    it('runs recreate tables after confirming the operation modal', async () => {
      renderAdminApp('/etl-administration');
      await screen.findByRole('button', { name: 'ETL operations' });

      await user.click(document.querySelector('.cds--combo-button__trigger') as HTMLElement);
      await user.click(await screen.findByTitle('Recreate tables'));

      expect(mockShowModal).toHaveBeenCalledWith(
        'operation-confirmation-modal',
        expect.objectContaining({ operationName: 'Recreate tables' }),
      );
      const [, modalProps] = mockShowModal.mock.calls.at(-1) as [string, { confirm: () => Promise<void> }];

      await act(async () => {
        await modalProps.confirm();
      });

      expect(allFetchUrls(apiFetchMock)).toEqual(
        expect.arrayContaining([expect.stringContaining('/ws/rest/v1/kemrchart/recreateTables')]),
      );
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
      expect(await screen.findByText('sp_update_etl_tables')).toBeInTheDocument();
    });

    it('shows an error snackbar when refresh tables fails', async () => {
      installFetchDispatcher(apiFetchMock, [
        { match: /kemrchart\//, error: { responseBody: { error: { message: 'ETL failure' } } } },
        ...defaultRoutes(),
      ]);
      renderAdminApp('/etl-administration');
      await screen.findByRole('button', { name: 'ETL operations' });

      await user.click(document.querySelector('.cds--combo-button__trigger') as HTMLElement);
      await user.click(await screen.findByTitle('Refresh tables'));
      const [, modalProps] = mockShowModal.mock.calls.at(-1) as [string, { confirm: () => Promise<void> }];

      await act(async () => {
        await modalProps.confirm();
      });

      expect(allFetchUrls(apiFetchMock)).toEqual(
        expect.arrayContaining([expect.stringContaining('/ws/rest/v1/kemrchart/refreshTables')]),
      );
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
    });

    it('does not run the operation when the modal is dismissed', async () => {
      renderAdminApp('/etl-administration');
      await screen.findByRole('button', { name: 'ETL operations' });

      await user.click(document.querySelector('.cds--combo-button__trigger') as HTMLElement);
      await user.click(await screen.findByTitle('Recreate tables'));
      const [, modalProps] = mockShowModal.mock.calls.at(-1) as [string, { close: () => void }];

      act(() => modalProps.close());

      expect(allFetchUrls(apiFetchMock).some((url) => url.includes('kemrchart'))).toBe(false);
      expect(mockShowSnackbar).not.toHaveBeenCalled();
    });
  });

  describe('/facility-setup', () => {
    it('renders the synced facility record in section cards', async () => {
      renderAdminApp('/facility-setup');

      expect(await screen.findByText('General information')).toBeInTheDocument();
      expect(screen.getByText('License & SHA status')).toBeInTheDocument();
      expect(screen.getByText('Contact & administrator')).toBeInTheDocument();
      expect(screen.getByText('Bed occupancy')).toBeInTheDocument();
      expect(screen.getByText(facilityRegistryFixture.official_name)).toBeInTheDocument();
      expect(screen.getByText(facilityRegistryFixture.fr_code)).toBeInTheDocument();

      expect(allFetchUrls(apiFetchMock)).toEqual(
        expect.arrayContaining([expect.stringContaining('/ws/rest/v1/virtualclaims/facility-registry')]),
      );
    });

    it('offers Sync now when the facility is not yet synced, then renders the pulled record', async () => {
      let synced = false;
      installFetchDispatcher(apiFetchMock, [
        {
          match: 'facility-registry/sync',
          response: () => {
            synced = true;
            return { data: facilityRegistryFixture };
          },
        },
        {
          match: 'virtualclaims/facility-registry',
          response: () => {
            if (!synced) {
              throw Object.assign(new Error('Not found'), { response: { status: 404 } });
            }
            return { data: facilityRegistryFixture };
          },
        },
        ...defaultRoutes(),
      ]);
      renderAdminApp('/facility-setup');

      expect(await screen.findByText('Facility details')).toBeInTheDocument();
      expect(
        screen.getByText('This facility has not been pulled from the registry. Click sync to fetch the latest record.'),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /sync now/i }));

      const syncCall = allFetchCalls(apiFetchMock).find(([url]) => url.includes('facility-registry/sync'));
      expect(syncCall?.[1]).toEqual(expect.objectContaining({ method: 'POST' }));
      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
      });
      expect(await screen.findByText('General information')).toBeInTheDocument();
    });

    it('shows the error tile with retry when the registry request hard-fails', async () => {
      installFetchDispatcher(apiFetchMock, [
        { match: 'facility-registry/sync', error: { responseBody: { error: 'Registry unreachable' } } },
        {
          match: 'virtualclaims/facility-registry',
          error: Object.assign(new Error('Server error'), { response: { status: 500 } }),
        },
        ...defaultRoutes(),
      ]);
      renderAdminApp('/facility-setup');

      expect(await screen.findByText('Failed to load the facility record.')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /retry sync/i }));
      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({ kind: 'error', subtitle: 'Registry unreachable' }),
        );
      });
    });
  });

  describe('/locations', () => {
    it('loads location tags then the tagged FHIR locations into the table', async () => {
      renderAdminApp('/locations');

      expect(await screen.findByText('Mbagathi Hospital')).toBeInTheDocument();
      expect(screen.getByText('Kibera Clinic')).toBeInTheDocument();
      expect(screen.getByText('Facility')).toBeInTheDocument();
      expect(screen.getByText('Clinic')).toBeInTheDocument();

      const urls = allFetchUrls(apiFetchMock);
      expect(urls).toEqual(
        expect.arrayContaining([
          expect.stringContaining('/ws/rest/v1/locationtag?v=custom:(uuid,display,name,description)'),
        ]),
      );
      expect(urls).toEqual(
        expect.arrayContaining([expect.stringMatching(/fhir2\/R4\/Location\?_summary=data&_tag=Facility,Clinic/)]),
      );
    });

    it('filters locations through the search box', async () => {
      renderAdminApp('/locations');
      await screen.findByText('Mbagathi Hospital');

      await user.type(screen.getByPlaceholderText('Search location'), 'Kibera');
      expect(screen.getByText('Kibera Clinic')).toBeInTheDocument();
      expect(screen.queryByText('Mbagathi Hospital')).not.toBeInTheDocument();
    });

    it('launches the add and tag location workspaces', async () => {
      renderAdminApp('/locations');
      await screen.findByText('Mbagathi Hospital');

      await user.click(screen.getByRole('button', { name: /add location/i }));
      expect(mockLaunchWorkspace2).toHaveBeenCalledWith('add-location-workspace', {
        workspaceProps: { workspaceTitle: 'Add Location' },
      });

      await user.click(screen.getByRole('button', { name: /tag location/i }));
      expect(mockLaunchWorkspace2).toHaveBeenCalledWith('search-location-workspace', {
        workspaceProps: { workspaceTitle: 'Tag Location' },
      });
    });
  });
});
