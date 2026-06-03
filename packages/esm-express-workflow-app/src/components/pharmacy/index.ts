import { getAsyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';
export * from './tabs';
const options = {
  featureName: 'express-workflow',
  moduleName,
};

// t('pharmacy', 'Pharmacy')
export const pharmacyLink = getAsyncLifecycle(
  () =>
    import('../../shared/dashboard-link/dashboard-link.component').then((m) => ({
      default: m.createLeftPanelLink({
        name: 'pharmacy',
        title: 'pharmacy',
      }),
    })),
  options,
);
export const pharmacy = getAsyncLifecycle(() => import('./pharmacy.component'), options);
export const pharmacyTabs = getAsyncLifecycle(() => import('./pharmacy-tabs.component'), options);

// t('precription', 'Prescription')
export const pharmacyPatientChartDashboardLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        path: 'pharmacy',
        title: 'prescription',
        icon: 'omrs-icon-medication',
      }),
    })),
  options,
);
export const pharmacyOrders = getAsyncLifecycle(() => import('./orders/pharmacy-orders.component'), options);
