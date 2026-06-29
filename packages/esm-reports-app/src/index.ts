import { defineConfigSchema, getAsyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@kenyaemr/esm-esm-reports-app';

const options = {
  featureName: 'esm-reports-app',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');
export const reportsDashboard = getAsyncLifecycle(() => import('./root.component'), options);
export const reportRequestWorkspaces = getAsyncLifecycle(
  () => import('./workspaces/report-request.workspaces'),
  options,
);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}
