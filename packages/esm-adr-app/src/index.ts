import { defineConfigSchema, getAsyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@kenyaemr/esm-adr-app';

const options = {
  featureName: 'adr-assessment',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export const adrAssessmentApp = getAsyncLifecycle(() => import('./root.component'), options);
export const adrAssessmentSideNav = getAsyncLifecycle(
  () => import('./components/side-menu/side-menu.component'),
  options,
);
export const adrAssessmentSummary = getAsyncLifecycle(() => import('./components/summary/summary.component'), options);
export const patientAdrWorkspace = getAsyncLifecycle(() => import('./components/patient-adr.workspace'), options);
// Print Preview Components
export const adrPrintPreviewModal = getAsyncLifecycle(
  () => import('./components/print-preview/print-preview.modal'),
  options,
);
export const adrEmailModal = getAsyncLifecycle(() => import('./components/print-preview/email.modal'), options);

// Dashboard link for the search page
export const overviewDashboardLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        moduleName,
        path: 'overview',
        title: 'Overview',
        icon: 'omrs-icon-group-access',
      }),
    })),
  options,
);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}
