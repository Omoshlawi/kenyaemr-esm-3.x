import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle, registerFeatureFlag } from '@openmrs/esm-framework';

import { configSchema } from './config-schema';
import { accountingDashboardMeta } from './dashboard.meta';
const moduleName = '@kenyaemr/esm-billing-app';
const options = {
  featureName: 'billing',
  moduleName,
};

// Dashboard and Navigation Components
import { createLeftPanelLink } from './left-panel-link.component';

// Translation
export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

// Core Components
export const root = getAsyncLifecycle(() => import('./root.component'), options);
export const billingPatientSummary = getAsyncLifecycle(() => import('./bill-history/bill-history.component'), options);
export const billingCheckInForm = getAsyncLifecycle(
  () => import('./billing-form/billing-checkin-form.component'),
  options,
);
export const billingForm = getAsyncLifecycle(
  () => import('./billing-form/create-bill/billing-form.component'),
  options,
);
export const visitAttributesWorkspace = getAsyncLifecycle(() => import('./visits/visit-attributes.workspace'), options);
export const billingDashboard = getAsyncLifecycle(
  () => import('./billing-dashboard/billing-dashboard.component'),
  options,
);

// Patient Billing Components
export const deleteBillableServiceModal = getAsyncLifecycle(
  () => import('./bill-administration/patient-billing/modals/delete-billable-service.modal'),
  options,
);
export const createBillWorkspace = getAsyncLifecycle(
  () => import('./bill-administration/patient-billing/workspaces/create-bill/create-bill.workspace'),
  options,
);
export const deleteBillModal = getAsyncLifecycle(
  () =>
    import('./bill-administration/patient-billing/modals/delete-bill.modal').then((m) => ({
      default: m.DeleteBillModal,
    })),
  options,
);
export const waiveBillForm = getAsyncLifecycle(
  () =>
    import('./bill-administration/patient-billing/workspaces/waive-bill/waive-bill-form.workspace').then((m) => ({
      default: m.WaiveBillForm,
    })),
  options,
);
export const editBillForm = getAsyncLifecycle(
  () =>
    import('./bill-administration/patient-billing/workspaces/edit-bill/edit-bill-form.workspace').then((m) => ({
      default: m.EditBillForm,
    })),
  options,
);
export const refundBillModal = getAsyncLifecycle(
  () =>
    import('./bill-administration/patient-billing/modals/refund-bill.modal').then((m) => ({
      default: m.RefundBillModal,
    })),
  options,
);
export const billActionModal = getAsyncLifecycle(() => import('./modal/bill-action.modal'), options);
export const cancelBillWorkspace = getAsyncLifecycle(
  () => import('./bill-administration/patient-billing/workspaces/cancel-bill/cancel-bill.workspace'),
  options,
);
export const waiveBillActionButton = getAsyncLifecycle(
  () => import('./bill-administration/patient-billing/bill-actions/waive-bill-action-button.component'),
  options,
);
export const deleteBillActionButton = getAsyncLifecycle(
  () => import('./bill-administration/patient-billing/bill-actions/delete-bill-action-button.component'),
  options,
);
export const refundLineItem = getAsyncLifecycle(
  () => import('./bill-administration/patient-billing/bill-actions/refund-line-item.component'),
  options,
);
export const cancelLineItem = getAsyncLifecycle(
  () => import('./bill-administration/patient-billing/bill-actions/cancel-line-item.component'),
  options,
);
export const editLineItem = getAsyncLifecycle(
  () => import('./bill-administration/patient-billing/bill-actions/edit-line-item.component'),
  options,
);

// Order Components
export const labOrder = getAsyncLifecycle(
  () => import('./billable-services/billable-orders/test-order/lab-order.component'),
  options,
);
export const priceInfoOrder = getAsyncLifecycle(
  () => import('./billable-services/billable-orders/test-order/price-info-order.componet'),
  options,
);
export const procedureOrder = getAsyncLifecycle(
  () => import('./billable-services/billable-orders/test-order/procedure-order.component'),
  options,
);
export const imagingOrder = getAsyncLifecycle(
  () => import('./billable-services/billable-orders/test-order/imaging-order.component'),
  options,
);
export const drugOrder = getAsyncLifecycle(
  () => import('./billable-services/billable-orders/drug-order/drug-order.component'),
  options,
);
export const orderActionButton = getAsyncLifecycle(
  () => import('./billable-services/billable-orders/order-actions/components/order-action-button.component'),
  options,
);

export const preauthFormWorkspace = getAsyncLifecycle(
  () => import('./claims/claims-management/table/virtual-claim-preauth/pre-auth-workspace/pre-auth-form.workspace'),
  options,
);

export const electivePreauthFormWorkspace = getAsyncLifecycle(
  () =>
    import('./claims/claims-management/table/virtual-claim-preauth/elective-auth-workspace/elective-auth.workspace'),
  options,
);

// Benefits Components
export const benefitsPackage = getAsyncLifecycle(
  () => import('./benefits-package/benefits-package.component'),
  options,
);
export const benefits = getAsyncLifecycle(() => import('./benefits-package/benefits/benefits.component'), options);
export const benefitsPreAuthForm = getAsyncLifecycle(
  () => import('./benefits-package/forms/benefit-pre-auth-form.workspace'),
  options,
);

// Payment Components
export const requirePaymentModal = getAsyncLifecycle(
  () => import('./prompt-payment/prompt-payment-modal.component'),
  options,
);
export const visitAttributeTags = getAsyncLifecycle(
  () => import('./invoice/payments/visit-tags/visit-attribute.component'),
  options,
);
export const initiatePaymentDialog = getAsyncLifecycle(
  () => import('./invoice/payments/initiate-payment/initiate-payment.component'),
  options,
);
export const paymentModeWorkspace = getAsyncLifecycle(
  () => import('./bill-administration/payment-modes/payment-mode.workspace'),
  options,
);
export const deletePaymentModeModal = getAsyncLifecycle(
  () => import('./bill-administration/payment-modes/delete-payment-mode.modal'),
  options,
);

// Payment Points Components
export const createPaymentPoint = getAsyncLifecycle(
  () =>
    import('./bill-administration/payment-points/create-payment-point.component').then((m) => ({
      default: m.CreatePaymentPoint,
    })),
  options,
);
export const clockIn = getAsyncLifecycle(
  () =>
    import('./bill-administration/payment-points/payment-point/clock-in.modal').then((m) => ({
      default: m.ClockIn,
    })),
  options,
);
export const clockOut = getAsyncLifecycle(
  () =>
    import('./bill-administration/payment-points/payment-point/clock-out.modal').then((m) => ({
      default: m.ClockOut,
    })),
  options,
);

// Service Management Components
export const addServiceForm = getAsyncLifecycle(
  () => import('./bill-administration/service-catalog/services/service-form.workspace'),
  options,
);
export const commodityForm = getAsyncLifecycle(
  () => import('./bill-administration/service-catalog/commodity/commodity-form.workspace'),
  options,
);
export const bulkImportBillableServicesModal = getAsyncLifecycle(
  () => import('./bill-administration/service-catalog/bulk-import-billable-service.modal'),
  options,
);

export const claimAttachmentsWorkspace = getAsyncLifecycle(
  () => import('./claims/claims-wrap/claim-workspaces/attachements/claim-attachements-workspace'),
  options,
);

export const claimDoctorsWorkspace = getAsyncLifecycle(
  () => import('./claims/claims-wrap/claim-workspaces/doctors/claim-doctor-workspace'),
  options,
);

export const manageInterventionsWorkspace = getAsyncLifecycle(
  () => import('./claims/claims-wrap/claim-workspaces/interventions/manage-interventions-workspace'),
  options,
);

export const claimSubmissionWorkspace = getAsyncLifecycle(
  () => import('./claims/claims-wrap/claim-workspaces/claim-submission/ClaimSubmitWorkspace'),
  options,
);

export const claimDocumentGeneratorWorkspace = getAsyncLifecycle(
  () => import('./claims/claims-wrap/claim-workspaces/claim-document-generator/claim-document-generator-workspace'),
  options,
);
export const manageClaimRequestModal = getAsyncLifecycle(
  () =>
    import('./claims/claims-management/table/manage-claim-request.modal').then((m) => ({
      default: m.ManageClaimRequest,
    })),
  options,
);
export const claimPreviewModal = getAsyncLifecycle(
  () => import('./claims/claims-management/table/claim-summary-modal/claim-preview.modal'),
  options,
);
export const claimCloseModal = getAsyncLifecycle(
  () => import('./claims/claims-management/table/claim-summary-modal/cancel-claim.modal'),
  options,
);
export const claimResubmitModal = getAsyncLifecycle(
  () => import('./claims/claims-management/table/claim-summary-modal/claim-line-resubmit.modal'),
  options,
);
export const claimEditLineModal = getAsyncLifecycle(
  () => import('./claims/claims-management/table/claim-summary-modal/claim-edit-line.modal'),
  options,
);

export const claimDeleteLineModal = getAsyncLifecycle(
  () => import('./claims/claims-management/table/claim-summary-modal/claim-delete-line.modal'),
  options,
);

export const replaceAttachmentModal = getAsyncLifecycle(
  () => import('./claims/claims-wrap/claim-workspaces/attachements/replace-attachment.modal'),
  options,
);

export const resubmitConfirmModal = getAsyncLifecycle(
  () => import('./claims/claims-wrap/claim-workspaces/claim-submission/resubmit-confirm.modal'),
  options,
);

// Print Preview Components
export const printPreviewModal = getAsyncLifecycle(() => import('./print-preview/print-preview.modal'), options);
export const patientBannerShaStatus = getAsyncLifecycle(
  () => import('./billing-form/social-health-authority/patient-banner-sha-status.extension'),
  {
    featureName: 'patient-sha-status',
    moduleName,
  },
);

export const accountingDashboardLink = getSyncLifecycle(createLeftPanelLink({ ...accountingDashboardMeta }), options);
export * from './bill-administration/index';

// App Startup
export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
  registerFeatureFlag(
    'healthInformationExchange',
    'Health Information Exchange (HIE)',
    'HIE feature flag, this enables and disables the HIE feature',
  );
}

export const paymentWorkspace = getAsyncLifecycle(
  () => import('./invoice/payments/payment-form/payment.workspace'),
  options,
);

export const preauthOperationWorkspace = getAsyncLifecycle(
  () =>
    import(
      './claims/claims-management/table/virtual-claim-preauth/patient-preauth-history/preauth-operations/preauth-operation.workspace'
    ),
  options,
);

export const resubmitClaimPage = getAsyncLifecycle(
  () => import('./claims/claims-management/pages/resubmit-claim-page.component'),
  options,
);
