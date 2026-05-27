import { getSyncLifecycle } from '@openmrs/esm-framework';
import { createTabExtension } from '../../../shared/tabs/create-tab-extension';

const options = {
  featureName: 'express-workflow',
  moduleName: '@kenyaemr/esm-express-workflow-app',
};
// t('orders', 'Orders')
export const pharmacyOrdersTab = getSyncLifecycle(createTabExtension(), options);
// t('activeMedications', 'Active Medications')
export const pharmacyActiveMedicationsTab = getSyncLifecycle(createTabExtension(), options);
// t('pastMedications', 'Past Medications')
export const pharmacyPastMedicationsTab = getSyncLifecycle(createTabExtension(), options);
