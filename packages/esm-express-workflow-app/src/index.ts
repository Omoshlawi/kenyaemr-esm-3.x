import { defineConfigSchema, getAsyncLifecycle, registerFeatureFlag } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
export * from './components/accounting';
export * from './components/admissions';
export * from './components/appointments';
export * from './components/consultation';
export * from './components/facility-dashboard';
export * from './components/laboratory';
export * from './components/mch';
export * from './components/pharmacy';
export * from './components/procedures';
export * from './components/procedures/procedure-queues';
export * from './components/radiology-and-imaging';
export * from './components/registration';
export * from './components/triage';
const moduleName = '@kenyaemr/esm-express-workflow-app';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
  registerFeatureFlag(
    'procedureQueues',
    'Procedure Queues',
    'Enable/Disable procedure queue in procedure pannel and procedure form',
  );
  registerFeatureFlag('pcsSite', 'PCS Site', 'Enable/Disable PCS Site');
}

export const root = getAsyncLifecycle(() => import('./root.component'), options);
export const otpVerificationModal = getAsyncLifecycle(
  () => import('./shared/otp-verification/otp-verification.modal'),
  options,
);
export const checkinFormExtraExtension = getAsyncLifecycle(
  () => import('./components/registration/checkin-form-extra/checkin-form-extra.extension'),
  options,
);
export const patientSummaryDashboard = getAsyncLifecycle(
  () => import('./shared/patient-chart/patient-summary-dashboard/patient-summary-dashboard.component'),
  options,
);

export const customStartVisitOverflowMenuItem = getAsyncLifecycle(
  () => import('./components/registration/start-visit-form/overflow-menu-extension/overflow-menu-item.extension'),
  {
    featureName: 'patient-actions-slot-start-visit-button',
    moduleName,
  },
);
export const customStopVisitOverflowMenuItem = getAsyncLifecycle(
  () => import('./components/registration/start-visit-form/overflow-menu-extension/custom-end-active-visit.extension'),
  {
    featureName: 'patient-actions-slot-stop-visit-button',
    moduleName,
  },
);

export const printOrderPreviewModal = getAsyncLifecycle(
  () => import('./shared/orders/print-order/print-order.component'),
  {
    featureName: 'print-order-preview',
    moduleName,
  },
);

export const printPrescriptionModal = getAsyncLifecycle(
  () => import('./shared/orders/print-prescription/print-prescription.component'),
  {
    featureName: 'print-prescription',
    moduleName,
  },
);

export const visitFormWorkspace = getAsyncLifecycle(
  () => import('./components/registration/start-visit-form/visit-form-workspace/visit-form.workspace'),
  options,
);

export const customEndVisitModal = getAsyncLifecycle(
  () => import('./components/registration/end-visit-modal/end-visit-dialog.modal'),
  {
    featureName: 'custom-patient-actions-end-visit-modal',
    moduleName,
  },
);

export const demographicSyncModal = getAsyncLifecycle(
  () => import('./components/registration/card/Local-card/demographic-sync.modal'),
  {
    featureName: 'demographic-sync-modal',
    moduleName,
  },
);

export const pcsLinkParticipantModal = getAsyncLifecycle(
  () => import('./components/registration/pcs/modals/link-participant.modal'),
  {
    featureName: 'pcs-link-participant-modal',
    moduleName,
  },
);

export const pcsDelinkParticipantModal = getAsyncLifecycle(
  () => import('./components/registration/pcs/modals/delink-participant.modal'),
  {
    featureName: 'pcs-delink-participant-modal',
    moduleName,
  },
);

export const pcsLinkDependantModal = getAsyncLifecycle(
  () => import('./components/registration/pcs/modals/link-dependant.modal'),
  {
    featureName: 'pcs-link-dependant-modal',
    moduleName,
  },
);

export const pcsAddDependantWorkspace = getAsyncLifecycle(
  () => import('./components/registration/pcs/add-dependant/add-dependant.workspace'),
  {
    featureName: 'pcs-add-dependant-workspace',
    moduleName,
  },
);

export const pcsLinkHieDependantWorkspace = getAsyncLifecycle(
  () => import('./components/registration/pcs/link-hie-dependant/link-hie-dependant.workspace'),
  {
    featureName: 'pcs-link-hie-dependant-workspace',
    moduleName,
  },
);

export const anaestheticFormWorkspace = getAsyncLifecycle(
  () => import('./components/anaesthetic/forms/anaesthetic-form.component'),
  options,
);

export const interoperativeDrugGivenFormWorkspace = getAsyncLifecycle(
  () => import('./components/anaesthetic/forms/interoperative-record-drug-given-form.component'),
  options,
);

export const queuesAdminHome = getAsyncLifecycle(() => import('./shared/queue/queues-home.component'), options);

export const homepageDashboardLink = getAsyncLifecycle(
  () =>
    Promise.all([import('./shared/dashboard-link/dashboard-link.component'), import('@carbon/react/icons')]).then(
      ([m, icons]) => ({
        default: m.createLeftPanelLink({
          name: 'consultation',
          title: 'Home',
          icon: icons.Home,
        }),
      }),
    ),
  options,
);

export const procedureAndOrdersTab = getAsyncLifecycle(
  () => import('./shared/tabs/create-tab-extension').then((mod) => ({ default: mod.createTabExtension() })),
  options,
);
