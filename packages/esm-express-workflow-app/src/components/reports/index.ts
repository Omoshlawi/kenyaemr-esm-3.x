import { getAsyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const reportsDashboard = getAsyncLifecycle(() => import('./dashboard.component'), options);
// t('reports', 'Reports')
export const reportsDashboardLink = getAsyncLifecycle(
  () =>
    import('../../shared/dashboard-link/dashboard-link.component').then((m) => ({
      default: m.createLeftPanelLink({
        name: 'reports',
        title: 'reports',
      }),
    })),
  options,
);
