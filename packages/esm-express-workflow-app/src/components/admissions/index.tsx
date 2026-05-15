import { getAsyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const admissionsDashboard = getAsyncLifecycle(() => import('./admissions-dashboard.component'), options);
export const admissionsMedicationSummary = getAsyncLifecycle(() => import('./admission-medication-summary'), options);
// t('inPatient', 'In-Patient')
export const admissionsDashboardLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        path: 'admissions',
        title: 'inPatient',
        icon: 'omrs-icon-hospital-bed',
      }),
    })),
  options,
);
