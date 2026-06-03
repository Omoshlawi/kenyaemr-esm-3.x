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

// t("results", "Results")
export const patientProcedureOrdersResults = getAsyncLifecycle(
  () => import('../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
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
