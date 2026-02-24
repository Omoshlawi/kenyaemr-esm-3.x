import { getAsyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const registrationDashboard = getAsyncLifecycle(() => import('./registration.component'), options);
// t('registration', 'Registration')
export const registrationLeftPanelLink = getAsyncLifecycle(
  () =>
    import('../../shared/dashboard-link/dashboard-link.component').then((m) => ({
      default: m.createLeftPanelLink({
        title: 'registration',
        name: 'registration',
      }),
    })),
  options,
);
