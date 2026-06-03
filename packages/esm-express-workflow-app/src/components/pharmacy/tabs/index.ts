import { getAsyncLifecycle } from '@openmrs/esm-framework';

const options = {
  featureName: 'express-workflow',
  moduleName: '@kenyaemr/esm-express-workflow-app',
};
// t('orders', 'Orders')
export const pharmacyOrdersTab = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('activeMedications', 'Active Medications')
export const pharmacyActiveMedicationsTab = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('pastMedications', 'Past Medications')
export const pharmacyPastMedicationsTab = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
