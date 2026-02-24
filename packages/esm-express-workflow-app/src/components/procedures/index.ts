import { getAsyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const proceduresDashboard = getAsyncLifecycle(() => import('./procedures-tabs.component'), options);
// t('procedures', 'Procedures')
export const proceduresLeftPanelLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        path: 'procedures',
        title: 'procedures',
        icon: 'omrs-icon-movement',
      }),
    })),
  options,
);
