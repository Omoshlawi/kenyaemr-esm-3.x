import { defineConfigSchema, getAsyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { moduleName } from './constants';

const options = {
  featureName: 'esm-facility-dashboard-app',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export const root = getAsyncLifecycle(() => import('./root.component'), options);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const surveillanceDashboardLink = getAsyncLifecycle(
  () =>
    import('./left-pannel-link.component').then((m) => ({
      default: m.createLeftPanelLink({
        title: 'Surveillance',
        name: '',
      }),
    })),
  options,
);

export const aboveSiteDashboardLink = getAsyncLifecycle(
  () =>
    import('./left-pannel-link.component').then((m) => ({
      default: m.createLeftPanelLink({
        title: 'Above site Dashboard',
        name: 'above-site',
      }),
    })),
  options,
);
// t("dataTransmission", "Data transmission")
export const transmissionDashboardLink = getAsyncLifecycle(
  () =>
    import('./left-pannel-link.component').then((m) => ({
      default: m.createLeftPanelLink({
        title: 'dataTransmission',
        name: 'transmission',
      }),
    })),
  options,
);
export const airDashboardLink = getAsyncLifecycle(() => import('./air/air.component'), options);
export const reportsboardLink = getAsyncLifecycle(() => import('./reports/reports.component'), options);
export const dataTransmissionDashboard = getAsyncLifecycle(
  () => import('./transmision/transmission-dashboard.component'),
  options,
);
