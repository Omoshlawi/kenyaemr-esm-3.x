import { getAsyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const triageDashboard = getAsyncLifecycle(() => import('./dashboard.component'), options);
// t('triage', 'Triage')
export const triageLeftPanelLink = getAsyncLifecycle(
  () =>
    import('../../shared/dashboard-link/dashboard-link.component').then((m) => ({
      default: m.createLeftPanelLink({
        name: 'triage',
        title: 'triage',
      }),
    })),
  options,
);
