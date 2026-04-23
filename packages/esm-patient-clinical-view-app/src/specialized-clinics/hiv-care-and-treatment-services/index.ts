import { getSyncLifecycle } from '@openmrs/esm-framework';
import DefaulterTracing from './defaulter-tracing/defaulter-tracing.component';
import HivTestingEncountersList from './hiv-testing-services/views/hiv-testing/hiv-testing-services.component';
import HivPatientSummary from './hiv-patient-summary/hiv-patient-summary.component';
import HivCaseManagement from './hiv-case-management/hiv-case-management.component';

const options = {
  featureName: 'patient-clinical-view-app',
  moduleName: '@kenyaemr/esm-patient-clinical-view-app',
};
export const hiveCareAndTreamnentDefaulterTracing = getSyncLifecycle(DefaulterTracing, options);
export const hivCareAndTreatmentHTS = getSyncLifecycle(HivTestingEncountersList, options);
export const hivCareAndTreatmentPatientSummary = getSyncLifecycle(HivPatientSummary, options);
export const hivCareAndTreatmentCaseManagement = getSyncLifecycle(HivCaseManagement, options);
