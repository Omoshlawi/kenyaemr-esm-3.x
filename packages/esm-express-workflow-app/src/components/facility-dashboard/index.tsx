import { getAsyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const facilityDashboard = getAsyncLifecycle(() => import('./facility-dashboard.component'), options);

// t('dashboard', 'Dashboard')
export const facilityLeftPanelLink = getAsyncLifecycle(
  () =>
    import('../../shared/dashboard-link/dashboard-link.component').then((m) => ({
      default: m.createLeftPanelLink({
        title: 'dashboard',
        name: 'facility-dashboard',
      }),
    })),
  options,
);
