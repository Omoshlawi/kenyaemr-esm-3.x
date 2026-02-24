import { getAsyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const laboratoryDashboard = getAsyncLifecycle(() => import('./laboratory-tabs.component'), options);
// t('labOrders', 'Lab Orders')
export const laboratoryLeftPanelLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        path: 'laboratory',
        title: 'labOrders',
        icon: 'omrs-icon-microscope',
      }),
    })),
  options,
);
