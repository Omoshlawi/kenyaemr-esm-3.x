import { defineConfigSchema, getAsyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@kenyaemr/esm-cross-border-app';

const options = {
  featureName: 'cross-border',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export const crossBorderApp = getAsyncLifecycle(() => import('./root.component'), options);

export const crossBorderSideNav = getAsyncLifecycle(
  () => import('./components/side-menu/side-menu.component'),
  options,
);
export const crossBorderSearch = getAsyncLifecycle(() => import('./components/search/mpi-search.component'), options);
export const crossBorderSummary = getAsyncLifecycle(() => import('./components/summary/summary.component'), options);

export const crossBorderFormEntry = getAsyncLifecycle(
  () => import('./components/form-entry/form-entry.component'),
  options,
);
export const crossBorderPatientSearch = getAsyncLifecycle(
  () => import('./components/form-entry/patient-search.component'),
  options,
);

// Dashboard link for the search page
export const overviewDashboardLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        moduleName,
        path: 'overview',
        title: 'Overview',
        icon: 'omrs-icon-inventory-management',
      }),
    })),
  options,
);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}
