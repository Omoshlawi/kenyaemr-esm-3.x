import { getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';
import { createTabExtension } from '../../shared/tabs/create-tab-extension';

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

// t("results", "Results")
export const patientProcedureOrdersResults = getSyncLifecycle(createTabExtension(), options);
// t("order", "Orders")
export const patientProcedureOrdersTab = getAsyncLifecycle(
  () => import('../../components/procedures/procedures-table.component'),
  options,
);
// t('anaesthetic', 'Anaesthetic')
export const patientProcedureAnaestheticTab = getAsyncLifecycle(
  () => import('../../components/anaesthetic/anaesthetic.component'),
  options,
);
