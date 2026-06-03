import { getAsyncLifecycle } from '@openmrs/esm-framework';

const options = {
  featureName: 'express-workflow',
  moduleName: '@kenyaemr/esm-express-workflow-app',
};

// t('patientSummaryTab', 'Patient Summary')
export const patientSummary = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('vitalsAndAnthropometric', 'Vitals & Anthropometric')
export const patientVitals = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('carePanel', 'Care Panel')
export const carePanel = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('immunizations', 'Immunizations')
export const immunization = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('relationships', 'Relationships')
export const relationships = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('appointments', 'Appointments')
export const appointments = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t("attachments", "Attachments")
export const attachments = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('clinicalEncounterTab', 'Clinical Encounter')
export const patientClinicalEncounter = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('visits', 'Visits')
export const patientVisits = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('specialClinics', 'Special Clinics')
export const specialClinics = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('clinicalNotes', 'Clinical Notes')
export const clinicalNotes = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('investigations', 'Investigations')
export const investigationsTab = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('procedures', 'Procedures')
export const proceduresTab = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
// t('results', 'Results')
export const resultsTab = getAsyncLifecycle(
  () => import('../../../shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
