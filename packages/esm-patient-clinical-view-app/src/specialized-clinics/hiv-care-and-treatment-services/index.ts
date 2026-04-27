import { getSyncLifecycle } from '@openmrs/esm-framework';
import DefaulterTracing from './defaulter-tracing/defaulter-tracing.component';
import HivTestingEncountersList from './hiv-testing-services/views/hiv-testing/hiv-testing-services.component';
import HivPatientSummary from './hiv-patient-summary/hiv-patient-summary.component';
import HivCaseManagement from './hiv-case-management/hiv-case-management.component';
import HIVProgramManagment from './program-management/hiv-program-management.component';
import HIVGeneralCounseling from './general-counseling/hive-general-counseling.component';
import HivPatnerNoficationService from './patner-notification-service/hiv-patner-notification-services.component';

const options = {
  featureName: 'patient-clinical-view-app',
  moduleName: '@kenyaemr/esm-patient-clinical-view-app',
};
// Tab names translations are loaded from route.json `meta.title` property, hence the commented translations below
// t("Defaulter Tracing", "Defaulter Tracing")
export const hiveCareAndTreamnentDefaulterTracing = getSyncLifecycle(DefaulterTracing, options);
// t("HIV Testing Services", "HIV Testing Services")
export const hivCareAndTreatmentHTS = getSyncLifecycle(HivTestingEncountersList, options);
// t("HIV Patient Summary", "HIV Patient Summary")
export const hivCareAndTreatmentPatientSummary = getSyncLifecycle(HivPatientSummary, options);
// t("Case Management", "Case Management")
export const hivCareAndTreatmentCaseManagement = getSyncLifecycle(HivCaseManagement, options);
// t("Program Management", "Program Management")
export const hivCareAndTreatmentProgramManagement = getSyncLifecycle(HIVProgramManagment, options);
// t("General Counseling", "General Counseling")
export const hivCareAndTreatmentGeneralCounseling = getSyncLifecycle(HIVGeneralCounseling, options);
// t("Partner Notification Services", "Partner Notification Services")
export const hivCareAndTreatmentPartnerNotificationServices = getSyncLifecycle(HivPatnerNoficationService, options);
