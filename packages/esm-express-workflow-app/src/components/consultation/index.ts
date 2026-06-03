import { getAsyncLifecycle } from '@openmrs/esm-framework';
export * from './tabs';
import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const consultationDashboard = getAsyncLifecycle(() => import('./dashboard.component'), options);
// t('consultation', 'Consultation')
export const consultationLeftPanelLink = getAsyncLifecycle(
  () =>
    import('../../shared/dashboard-link/dashboard-link.component').then((m) => ({
      default: m.createLeftPanelLink({
        title: 'consultation',
        name: 'consultation',
      }),
    })),
  options,
);

export const clinicalEncounter = getAsyncLifecycle(
  () => import('./clinical-encounter/clinical-encounter.component'),
  options,
);
// TODO: register Stethoscope icon in the icon registry
// t('clinicalEncounter', 'Clinical Encounter')
export const clinicalEncounterLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        title: 'clinicalEncounter',
        path: 'clinical-encounter',
        icon: 'omrs-icon-syringe',
      }),
    })),
  options,
);

export const encounterDetails = getAsyncLifecycle(
  () => import('./clinical-encounter/encounter-details.component'),
  options,
);
// t("historyAndExamination", "History & Examination")
export const historyAndExamination = getAsyncLifecycle(
  () => import('./clinical-encounter/history-and-examination.components'),
  options,
);
// t("diagnosisAndManagement", "Diagnosis & Management")
export const diagnosisAndManagement = getAsyncLifecycle(
  () => import('./clinical-encounter/diagnosis-and-management.component'),
  options,
);
export const assignToNextQueueAction = getAsyncLifecycle(
  () => import('./actions/assign-next-queue.component'),
  options,
);
