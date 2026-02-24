import { defineConfigSchema, getAsyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@kenyaemr/esm-express-workflow-app';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}
export * from './components/facility-dashboard';
export * from './components/registration';
export * from './components/triage';
export * from './components/accounting';
export * from './components/consultation';
export * from './components/mch';
export * from './components/reports';
export * from './components/pharmacy';
export * from './components/laboratory';
export * from './components/radiology-and-imaging';
export * from './components/procedures';
export * from './components/admissions';
export * from './components/appointments';

export const root = getAsyncLifecycle(() => import('./root.component'), options);
export const otpVerificationModal = getAsyncLifecycle(
  () => import('./shared/otp-verification/otp-verification.modal'),
  options,
);
export const checkinFormExtraExtension = getAsyncLifecycle(
  () => import('./components/registration/checkin-form-extra/checkin-form-extra.extension'),
  options,
);
export const patientSummaryDashboard = getAsyncLifecycle(
  () => import('./shared/patient-chart/patient-summary-dashboard/patient-summary-dashboard.component'),
  options,
);

export const queuesAdminHome = getAsyncLifecycle(() => import('./shared/queue/queues-home.component'), options);
export const homepageDashboardLink = getAsyncLifecycle(
  () =>
    Promise.all([import('./shared/dashboard-link/dashboard-link.component'), import('@carbon/react/icons')]).then(
      ([m, icons]) => ({
        default: m.createLeftPanelLink({
          name: 'consultation',
          title: 'Home',
          icon: icons.Home,
        }),
      }),
    ),
  options,
);
