import { getAsyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const accountingDashboard = getAsyncLifecycle(() => import('./accounting.component'), options);
// t('accounting', 'Accounting')
export const accountingLeftPanelLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        title: 'accounting',
        path: 'accounting',
        icon: 'omrs-icon-money',
      }),
    })),
  options,
);
