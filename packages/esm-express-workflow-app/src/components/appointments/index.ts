import { getAsyncLifecycle } from '@openmrs/esm-framework';

const options = {
  featureName: 'express-workflow',
  moduleName: '@kenyaemr/esm-express-workflow-app',
};

export const appointmentsDashboard = getAsyncLifecycle(() => import('./dashboard.component'), options);
// t('appointments', 'Appointments')
export const appointmentsDashboardLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        path: 'appointments',
        title: 'appointments',
        icon: 'omrs-icon-calendar',
      }),
    })),
  options,
);
