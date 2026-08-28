import { defineConfigSchema, getAsyncLifecycle, registerFeatureFlag } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@kenyaemr/esm-pcs-app';

const options = {
  featureName: 'pcs',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export const pcsSearchResults = getAsyncLifecycle(() => import('./search/pcs-search.component'), options);

export const pcsLinkParticipantModal = getAsyncLifecycle(() => import('./modals/link-participant.modal'), options);

export const pcsDelinkParticipantModal = getAsyncLifecycle(() => import('./modals/delink-participant.modal'), options);

export const pcsLinkDependantModal = getAsyncLifecycle(() => import('./modals/link-dependant.modal'), options);

export const pcsAddDependantWorkspace = getAsyncLifecycle(
  () => import('./add-dependant/add-dependant.workspace'),
  options,
);

export const pcsLinkHieDependantWorkspace = getAsyncLifecycle(
  () => import('./link-hie-dependant/link-hie-dependant.workspace'),
  options,
);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
  registerFeatureFlag('pcsSite', 'PCS Site', 'Enable/Disable PCS Site');
}
