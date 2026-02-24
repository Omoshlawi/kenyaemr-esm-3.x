import { getAsyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const mchDashboard = getAsyncLifecycle(() => import('./dashboard.component'), options);
// t('mch', 'MCH')
export const mchLeftPanelLink = getAsyncLifecycle(
  () =>
    import('../../shared/dashboard-link/dashboard-link.component').then((m) => ({
      default: m.createLeftPanelLink({
        title: 'mch',
        name: 'mch',
      }),
    })),
  options,
);
