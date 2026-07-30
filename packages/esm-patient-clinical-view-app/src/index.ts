import { defineConfigSchema, getAsyncLifecycle } from '@openmrs/esm-framework';

import { inPatientClinicalEncounterDashboardMeta } from './clinical-encounter/clinical-encounter-dashboard-meta';
import {
  caseEncounterDashboardMeta,
  caseManagementDashboardMeta,
  contactListDashboardMeta,
  peerCalendarDashboardMeta,
  relationshipsDashboardMeta,
  specialClinicsDashboardMeta,
} from './dashboard/dashboard.meta';
import { maternalAndChildHealthDashboardMeta } from './maternal-and-child-health/mch-dashboard.meta';
import { hivCareAndTreatmentDashboardMeta } from './specialized-clinics/hiv-care-and-treatment-services/hiv-care-and-treatment-dashboard.meta';

import { configSchema } from './config-schema';
export * from './specialized-clinics/hiv-care-and-treatment-services';
const moduleName = '@kenyaemr/esm-patient-clinical-view-app';

const options = {
  featureName: 'patient-clinical-view-app',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export const hivCareAndTreatmentLink = getAsyncLifecycle(
  () =>
    import('./dashboard/createDashboardLink').then((m) => ({
      default: m.createDashboardLink({
        ...hivCareAndTreatmentDashboardMeta,
        // t('HIV Care & Treatment', 'HIV Care & Treatment')
        title: hivCareAndTreatmentDashboardMeta.title,
        icon: 'omrs-icon-programs',
      }),
    })),
  options,
);
export const hivCareAndTreatment = getAsyncLifecycle(
  () => import('./specialized-clinics/hiv-care-and-treatment-services/hiv-care-and-treatment.component'),
  options,
);

export const relationshipsLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        ...relationshipsDashboardMeta,
        icon: 'omrs-icon-group',
      }),
    })),
  options,
);
export const relationships = getAsyncLifecycle(() => import('./relationships/relationships.component'), options);
export const relationshipDeleteConfirmialog = getAsyncLifecycle(
  () => import('./relationships/modals/delete-relationship-dialog.modal'),
  options,
);
export const familyRelationshipForm = getAsyncLifecycle(
  () => import('./family-partner-history/family-relationship.workspace'),
  options,
);

export const clinicalEncounterLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        ...inPatientClinicalEncounterDashboardMeta,
        icon: 'omrs-icon-syringe',
      }),
    })),
  options,
);
export const clinicalEncounter = getAsyncLifecycle(
  () => import('./clinical-encounter/dashboard/clinical-encounter-dashboard.component'),
  options,
);

export const contactListLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        ...contactListDashboardMeta,
        icon: 'omrs-icon-information',
      }),
    })),
  options,
);
export const contactList = getAsyncLifecycle(() => import('./contact-list/contact-dashboard.component'), options);
export const contactListForm = getAsyncLifecycle(() => import('./contact-list/contact-list.workspace'), options);
export const contactListUpdateForm = getAsyncLifecycle(
  () => import('./contact-list/forms/contact-list-update.workspace'),
  options,
);
export const birthDateCalculator = getAsyncLifecycle(
  () => import('./relationships/modals/birthdate-calculator.modal'),
  options,
);

export const peerCalendar = getAsyncLifecycle(() => import('./peer-calendar/peer-calendar.component'), options);
export const peerCalendarDashboardLink = getAsyncLifecycle(
  () =>
    import('./left-panel-link.component').then((m) => ({
      default: m.createLeftPanelLink(peerCalendarDashboardMeta),
    })),
  options,
);
export const peersForm = getAsyncLifecycle(() => import('./peer-calendar/forms/peer-form.workspace'), options);
export const peerCalendarFormEntry = getAsyncLifecycle(
  () => import('./peer-calendar/forms/form-entry.workspace'),
  options,
);
export const exportedPatientFormEntryWorkspace = getAsyncLifecycle(
  () => import('./forms/custom-form-entry.workspace'),
  options,
);

export const maternalAndChildHealthDashboardLink = getAsyncLifecycle(
  () =>
    import('./dashboard/createDashboardLink').then((m) => ({
      default: m.createDashboardLink({
        ...maternalAndChildHealthDashboardMeta,
        icon: 'omrs-icon-activity',
      }),
    })),
  options,
);
export const maternalAndChildHealthDashboard = getAsyncLifecycle(
  () => import('./maternal-and-child-health/maternal-and-child.component'),
  options,
);
export const antenatalCare = getAsyncLifecycle(
  () => import('./maternal-and-child-health/antenatal-care.component'),
  options,
);
export const postnatalCare = getAsyncLifecycle(
  () => import('./maternal-and-child-health/postnatal-care.component'),
  options,
);
export const labourAndDelivery = getAsyncLifecycle(
  () => import('./maternal-and-child-health/labour-delivery.component'),
  options,
);
export const partograph = getAsyncLifecycle(
  () => import('./maternal-and-child-health/partography/partograph.component'),
  options,
);

export const caseManagementDashboardLink = getAsyncLifecycle(
  () =>
    import('./left-panel-link.component').then((m) => ({
      default: m.createLeftPanelLink(caseManagementDashboardMeta),
    })),
  options,
);
export const wrapComponent = getAsyncLifecycle(() => import('./case-management/wrap/wrap.component'), options);
export const caseManagementForm = getAsyncLifecycle(
  () => import('./case-management/workspace/case-management.workspace'),
  options,
);
export const addPatientCaseForm = getAsyncLifecycle(
  () => import('./case-management/encounters/patient-case.workspace'),
  options,
);
export const caseEncounterDashboardLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        ...caseEncounterDashboardMeta,
        icon: 'omrs-icon-add',
      }),
    })),
  options,
);
export const caseEncounterTable = getAsyncLifecycle(
  () => import('./case-management/encounters/case-encounter-overview.component'),
  options,
);
export const endRelationshipWorkspace = getAsyncLifecycle(
  () => import('./case-management/workspace/case-management-workspace.component'),
  options,
);

export const specialClinicsDashboardLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        ...specialClinicsDashboardMeta,
        icon: 'omrs-icon-activity',
      }),
    })),
  options,
);
export const specialClinicsDashboard = getAsyncLifecycle(
  () => import('./special-clinics/special-clinic.component'),
  options,
);

export const patientComplaints = getAsyncLifecycle(() => import('./complaints/patient-complaints.component'), options);
export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const formEntryModal = getAsyncLifecycle(() => import('./modals/form-entry.modal'), options);

export const exportedLabResultsForm = getAsyncLifecycle(
  () => import('./lab-results/malaria-results.workspace'),
  options,
);
export const launchResultsButton = getAsyncLifecycle(
  () => import('./lab-results/launch-results-button.component'),
  options,
);
// t('caseSummary','Case Summary')
export const visitSummary = getAsyncLifecycle(() => import('./visit-summary/visit-summary.component'), options);

export const visitSummaryPrintPreviewModal = getAsyncLifecycle(
  () => import('./visit-summary/print-preview/visit-summary-print-preview.modal'),
  options,
);

export const extendedPatientInfo = getAsyncLifecycle(() => import('./patient-info/patient-info.component'), options);
