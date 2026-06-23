import { getAsyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const htsDashboard = getAsyncLifecycle(() => import('./dashboard.component'), options);
// t('hivTestingServices', 'HIV Testing Services')
export const htsLeftPanelLink = getAsyncLifecycle(
  () =>
    import('../../shared/dashboard-link/dashboard-link.component').then((m) => ({
      default: m.createLeftPanelLink({
        name: 'hts',
        title: 'hivTestingServices',
      }),
    })),
  options,
);

// t('hivTestingServices', 'HIV Testing Services')
export const patientChartHtsLeftPanelLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        path: 'hts',
        title: 'hivTestingServices',
        icon: 'omrs-icon-movement',
      }),
    })),
  options,
);

export const patientChartHtsDashboard = getAsyncLifecycle(() => import('./patient-chart-hts.component'), options);

// t("htsScreening", "Screning")
export const htsScreening = getAsyncLifecycle(() => import('./hts-screening.component'), options);
// t("htsTesting", "Testing")
export const htsTesting = getAsyncLifecycle(() => import('./hts-testing.component'), options);
