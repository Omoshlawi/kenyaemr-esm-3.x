import { getSyncLifecycle } from '@openmrs/esm-framework';
import { createTabExtension } from '../../../shared/tabs/create-tab-extension';

const options = {
  featureName: 'express-workflow',
  moduleName: '@kenyaemr/esm-express-workflow-app',
};

// t('patientSummaryTab', 'Patient Summary')
export const patientSummary = getSyncLifecycle(createTabExtension(), options);
// t('vitalsAndAnthropometric', 'Vitals & Anthropometric')
export const patientVitals = getSyncLifecycle(createTabExtension(), options);
// t('carePanel', 'Care Panel')
export const carePanel = getSyncLifecycle(createTabExtension(), options);
// t('immunizations', 'Immunizations')
export const immunization = getSyncLifecycle(createTabExtension(), options);
// t('relationships', 'Relationships')
export const relationships = getSyncLifecycle(createTabExtension(), options);
// t('appointments', 'Appointments')
export const appointments = getSyncLifecycle(createTabExtension(), options);
// t("attachments", "Attachments")
export const attachments = getSyncLifecycle(createTabExtension(), options);
// t('clinicalEncounterTab', 'Clinical Encounter')
export const patientClinicalEncounter = getSyncLifecycle(createTabExtension(), options);
// t('visits', 'Visits')
export const patientVisits = getSyncLifecycle(createTabExtension(), options);
// t('specialClinics', 'Special Clinics')
export const specialClinics = getSyncLifecycle(createTabExtension(), options);
// t('clinicalNotes', 'Clinical Notes')
export const clinicalNotes = getSyncLifecycle(createTabExtension(), options);
// t('proceduresAndOrders', 'Procedures & Orders')
export const proceduresAndOrders = getSyncLifecycle(createTabExtension(), options);
// t('resultsTab', 'Results')
export const proceduresAndOrdersResults = getSyncLifecycle(createTabExtension(), options);
