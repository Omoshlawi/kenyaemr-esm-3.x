import { defineConfigSchema, getAsyncLifecycle, registerBreadcrumbs } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { dashboardMeta } from './dashboard.meta';

const moduleName = '@kenyaemr/esm-care-panel-app';

const options = {
  featureName: 'patient-care-panels',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  registerBreadcrumbs([]);
  defineConfigSchema(moduleName, configSchema);
}

export const carePanelPatientSummary = getAsyncLifecycle(
  () => import('./care-panel-dashboard/care-panel-dashboard.component'),
  options,
);

export const deleteRegimenConfirmationDialog = getAsyncLifecycle(
  () => import('./regimen-editor/delete-regimen-modal.component'),
  options,
);

export const patientProgramSummary = getAsyncLifecycle(() => import('./care-panel/care-panel.component'), options);

export const patientCareProgram = getAsyncLifecycle(() => import('./care-programs/care-programs.component'), {
  moduleName: 'patient-care-programs',
  featureName: 'care-programs',
});

// t('carePanel', 'Care panel')
export const carePanelSummaryDashboardLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({ ...dashboardMeta, icon: 'omrs-icon-document', moduleName }),
    })),
  options,
);
export const hivPatientSummary = getAsyncLifecycle(
  () => import('./patient-summary/patient-summary.component'),
  options,
);
export const regimenFormWorkspace = getAsyncLifecycle(() => import('./regimen-editor/regimen-form.component'), options);

export const dispensingPaentientVitals = getAsyncLifecycle(
  () => import('./dispensing-patient-details/patient-vitals.component'),
  options,
);

export const patientDischargeSideRailIcon = getAsyncLifecycle(
  () => import('./patient-discharge/discharge-workspace-siderail.component'),
  options,
);
export const patientDischargeWorkspace = getAsyncLifecycle(
  () => import('./patient-discharge/patient-discharge.workspace'),
  options,
);
export const mchProgramForm = getAsyncLifecycle(() => import('./care-programs/program.workspace'), options);
export const kvpPeerLinkageForm = getAsyncLifecycle(
  () => import('./care-programs/kvp-peer-linkage-form.workspace'),
  options,
);
