import { defineConfigSchema, getSyncLifecycle, getAsyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { moduleName } from './constants';
import OperationConfirmation from './components/confirm-modal/confirmation-operation-modal.component';

const options = {
  featureName: 'esm-admin-app',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');
export * from './components/global-property/index';
export const root = getAsyncLifecycle(() => import('./root.component'), options);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const operationConfirmationModal = getSyncLifecycle(OperationConfirmation, options);
export const manageUserWorkspace = getAsyncLifecycle(
  () => import('./components/users/manage-users/user-management.workspace'),
  options,
);
export const userRoleScopeWorkspace = getAsyncLifecycle(
  () =>
    import(
      './components/users/manage-users/manage-user-role-scope/user-role-scope-workspace/user-role-scope.workspace'
    ),
  options,
);
// t("manageUsers", "Manage Users")
export const userManagementLeftPannelLink = getAsyncLifecycle(
  () =>
    import('./left-pannel-link.component').then((m) => ({
      default: m.createLeftPanelLink({ title: 'manageUsers', name: 'user-management' }),
    })),
  options,
);
// t("etlAdministration", "ETL Administration")
export const etlAdministrationLeftPannelLink = getAsyncLifecycle(
  () =>
    import('./left-pannel-link.component').then((m) => ({
      default: m.createLeftPanelLink({ title: 'etlAdministration', name: 'etl-administration' }),
    })),
  options,
);
// t("locations", "Locations")
export const locationsLeftPanelLink = getAsyncLifecycle(
  () =>
    import('./left-pannel-link.component').then((m) => ({
      default: m.createLeftPanelLink({ title: 'locations', name: 'locations' }),
    })),
  options,
);
// t("facilityDetails", "Facility Details")
export const facilitySetupLeftPanelLink = getAsyncLifecycle(
  () =>
    import('./left-pannel-link.component').then((m) => ({
      default: m.createLeftPanelLink({ title: 'facilityDetails', name: 'facility-setup' }),
    })),
  options,
);

export const hwrConfirmationModal = getAsyncLifecycle(
  () => import('./components/modal/hwr-confirmation.modal'),
  options,
);
export const hwrEmptyModal = getAsyncLifecycle(() => import('./components/modal/hwr-empty.modal.component'), options);
export const hwrSyncModal = getAsyncLifecycle(() => import('./components/modal/hwr-sync.modal'), options);

export const addLocation = getAsyncLifecycle(
  () => import('./components/locations/forms/add-location/add-location.workspace'),
  options,
);
export const searchLocationWorkspace = getAsyncLifecycle(
  () => import('./components/locations/forms/search-location/search-location.workspace'),
  options,
);
export const globalPropertyWorkspace = getAsyncLifecycle(
  () => import('./components/global-property/workspace/global-property.workspace'),
  options,
);
export const uploadLogoWorkspace = getAsyncLifecycle(
  () => import('./components/global-property/workspace/upload-logo.workspace'),
  options,
);
export const deleteGlobalPropertyModal = getAsyncLifecycle(
  () => import('./components/global-property/modal/delete-global-property-modal.component'),
  options,
);

// t('providerBanner', 'Provider banner')
export const providerBanner = getAsyncLifecycle(
  () => import('./components/provider-banner/provider-banner.component'),
  options,
);
