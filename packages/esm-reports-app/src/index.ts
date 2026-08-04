import { type ComponentType } from 'react';
import { defineConfigSchema, getAsyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@kenyaemr/esm-reports-app';

const options = {
  featureName: 'esm-reports-app',
  moduleName,
};

const loadReportsLeftPanelLink = (): Promise<{ default: ComponentType<unknown> }> =>
  import('./left-panel-link.component').then((m) => ({
    default: m.createLeftPanelLink({ title: 'Reports', name: 'reports', icon: 'omrs-icon-report' }),
  }));

const loadReportBuilderDashboard = (): Promise<{ default: ComponentType<unknown> }> =>
  import('./left-panel-link.component').then((m) => ({
    default: m.createLeftPanelLink({
      title: 'Builder',
      name: 'report-builder',
      icon: 'omrs-icon-settings',
      useBaseReportsPath: false,
    }),
  }));

const loadReportHistoryDashboard = (): Promise<{ default: ComponentType<unknown> }> =>
  import('./left-panel-link.component').then((m) => ({
    default: m.createLeftPanelLink({
      title: 'History',
      name: 'reports-history',
      icon: 'omrs-icon-activity',
    }),
  }));

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');
export const reportsDashboard = getAsyncLifecycle(() => import('./root.component'), options);
export const reportRequestWorkspaces = getAsyncLifecycle(
  () => import('./workspaces/report-request.workspaces'),
  options,
);
// t('Reports', 'Reports')
export const reportsLeftPanelLink = getAsyncLifecycle(loadReportsLeftPanelLink, options);

// t('History', 'History')
export const reportsHistoryDashboardLink = getAsyncLifecycle(loadReportHistoryDashboard, options);
export const reportsHistoryDashboard = getAsyncLifecycle(
  () => import('./components/report-history/report-history-dashboard.component'),
  options,
);

// t('Builder', 'Builder')
export const reportBuilderDashboardLink = getAsyncLifecycle(loadReportBuilderDashboard, options);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}
