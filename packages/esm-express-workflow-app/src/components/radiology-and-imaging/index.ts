import { getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';

import { moduleName } from '../../constants';
import { createTabExtension } from '../../shared/tabs/create-tab-extension';

const options = {
  featureName: 'express-workflow',
  moduleName,
};

export const radiologyAndImagingDashboard = getAsyncLifecycle(
  () => import('./radiology-and-imaging.component'),
  options,
);
// t('radiologyAndImaging', 'Radiology and Imaging')
export const radiologyAndImagingLeftPanelLink = getAsyncLifecycle(
  () =>
    import('@openmrs/esm-patient-common-lib').then((m) => ({
      default: m.createDashboardLink({
        path: 'radiology-and-imaging',
        title: 'radiologyAndImaging',
        icon: 'omrs-icon-user-xray',
      }),
    })),
  options,
);

// t("results", "Results")
export const patientImagingOrdersResults = getSyncLifecycle(createTabExtension(), options);
// t("order", "Orders")
export const patientImagingOrdersTab = getAsyncLifecycle(
  () => import('../../components/radiology-and-imaging/radiology-and-imaging-table.component'),
  options,
);
