import { defineConfigSchema, getAsyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@kenyaemr/esm-patient-flags-app';

const options = {
  featureName: 'patient-flags',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');
export const navbarButtons = getAsyncLifecycle(() => import('./navbar/navbar-action-button.component'), options);
export const patientFlag = getAsyncLifecycle(() => import('./patient-flags/patient-flags.component'), options);
export const patientDiagnosis = getAsyncLifecycle(
  () => import('./patient-diagnosis/patient-diagnosis.component'),
  options,
);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}
