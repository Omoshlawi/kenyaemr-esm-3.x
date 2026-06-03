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

// t("results", "Results")
export const patientLaboratoryOrdersResults = getAsyncLifecycle(
  () => import('./../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t("order", "Orders")
export const patientLaboratoryOrdersTab = getAsyncLifecycle(
  () => import('../../components/laboratory/lab-table.component'),
  options,
);
