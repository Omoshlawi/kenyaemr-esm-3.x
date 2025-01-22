import { HealthCross, IbmCloudBackupAndRecovery, Money, Stethoscope } from '@carbon/react/icons';
import { defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import DiagnosticsRoot from './app-navigation/diagnostics/diagnostics-root.component';
import { createDashboardGroup } from './app-navigation/nav-utils';
import { configSchema } from './config-schema';
import rootComponent from './root.component';
import LinkageServicesRoot from './app-navigation/linkage-services/linkage-services-root.component';

const moduleName = '@kenyaemr/esm-version-app';

const options = {
  featureName: 'esm-version-app',
  moduleName,
};

export const importTranslations = require.context('../translations', false, /.json$/, 'lazy');

export const about = getSyncLifecycle(rootComponent, options);
export const diagnosticsDashboardNavGroup = getSyncLifecycle(
  createDashboardGroup({
    slotName: 'diagnostics-group-nav-slot',
    title: 'Diagnostics',
    icon: Stethoscope,
    isExpanded: false,
  }),
  options,
);
export const linkageServicesDashboardNavGroup = getSyncLifecycle(
  createDashboardGroup({
    slotName: 'linkage-services-group-nav-slot',
    title: 'Linkage services',
    icon: HealthCross,
    isExpanded: false,
  }),
  options,
);
export const billingDashboardNavGroup = getSyncLifecycle(
  createDashboardGroup({
    slotName: 'billing-dashboard-link-slot',
    title: 'Billing Module',
    icon: Money,
    isExpanded: false,
  }),
  options,
);

export const claimsManagementSideNavGroup = getSyncLifecycle(
  createDashboardGroup({
    title: 'Claims Management',
    slotName: 'claims-management-dashboard-link-slot',
    isExpanded: false,
    icon: IbmCloudBackupAndRecovery,
  }),
  options,
);

export const diagnosticsRoot = getSyncLifecycle(DiagnosticsRoot, options);
export const linkageServicesRoot = getSyncLifecycle(LinkageServicesRoot, options);
export const billingRoot = getSyncLifecycle(LinkageServicesRoot, options);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}
