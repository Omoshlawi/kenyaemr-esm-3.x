import { getAsyncLifecycle, defineConfigSchema, registerBreadcrumbs } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
const moduleName = '@kenyaemr/esm-pharmacy-app';

const options = {
  featureName: 'esm-pharmacy-app',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  const pharmacyBasepath = `${window.spaBase}/home/pharmacy`;

  defineConfigSchema(moduleName, configSchema);
  registerBreadcrumbs([
    {
      title: 'pharmacy',
      path: pharmacyBasepath,
      parent: `${window.spaBase}/home`,
    },
  ]);
}

export const root = getAsyncLifecycle(() => import('./root.component'), options);
export const pharmacyAssignmentForm = getAsyncLifecycle(
  () => import('./pharamacy-forms/pharamacy-assignment-form.workspace'),
  options,
);
export const pharmacyDeleteConfirmDialog = getAsyncLifecycle(
  () => import('./pharamacy-forms/delete-confirm-dialog.modal'),
  options,
);
export const pharmacyDashboardLink = getAsyncLifecycle(
  () =>
    import('./pharmacy-left-panel/pharmacy-left-panel-link.component').then((m) => ({
      default: m.createLeftPanelLink({
        name: 'pharmacy',
        title: 'Community Pharmacy',
      }),
    })),
  options,
);
