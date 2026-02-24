import {
  defineConfigSchema,
  getAsyncLifecycle,
  registerBreadcrumbs,
  registerFeatureFlag,
} from '@openmrs/esm-framework';
import { referralDashboardMeta, shrSummaryDashboardMeta } from './dashboard.meta';
import { configSchema } from './config-schema';

const moduleName = '@kenyaemr/esm-shr-app';

const options = {
  featureName: '@kenyaemr/esm-shr-app',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export const shrPatientSummary = getAsyncLifecycle(
  () => import('./shrpatient-summary/shrpatient-summary.component'),
  options,
);

export function startupApp() {
  registerBreadcrumbs([]);
  registerFeatureFlag('shr-summary', 'SHR Summary', 'Adds authorization to pull a patient SHR information');
  defineConfigSchema(moduleName, configSchema);
}

export const ReferralsDashboardLink = getAsyncLifecycle(
  () =>
    import('./create-dashboard-link').then((m) => ({
      default: m.createHomeDashboardLink({
        name: 'referrals',
        title: 'Referrals',
      }),
    })),
  options,
);

export const shrSummaryDashboardLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        ...shrSummaryDashboardMeta,
        icon: 'omrs-icon-activity',
        moduleName,
      }),
    })),
  options,
);

export const shrHome = getAsyncLifecycle(() => import('./shr-home.component'), options);

export const referralReasonsDialogPopup = getAsyncLifecycle(
  () => import('./referrals/referral-reasons/referral-reasons.component'),
  {
    featureName: 'View Referral Reasons',
    moduleName,
  },
);

// Dashboard links for referrals and the corresponding view in the patient chart
export const referralWidget = getAsyncLifecycle(
  () => import('./referrals/patient-chart/referral-chart-view.component'),
  options,
);
export const referralLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        ...referralDashboardMeta,
        icon: 'omrs-icon-message-queue',
      }),
    })),
  options,
);
export const facilityRefferalForm = getAsyncLifecycle(
  () => import('./workspace/referrals.workspace.component'),
  options,
);

// SHR Summary
export const patientSHRSummary = getAsyncLifecycle(() => import('./shr-summary/shr-summary.component'), options);
export const shrAuthorizationForm = getAsyncLifecycle(
  () => import('./shr-summary/shr-authorization-form.workspace'),
  options,
);
export const referralWrap = getAsyncLifecycle(() => import('./referrals-wrap'), options);
